import * as THREE from "three"
// import * as Raycaster from "../../lib/three/src/core/Raycaster.js"
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'//
//import { GLTFLoader } from './GLTFLoader2.js'//
import { Visibility } from './Visibility.js'
import { P2P } from './P2P.js'
import { Detection } from './Detection.js'
import { ZipLoader } from '../../lib/zip/Ziploader'
import { IndirectMaterial } from '../../lib/threejs/IndirectMaterial'
import { WaterController  } from '../../lib/threejs/WaterController'

export class Building{
    constructor(scene,camera){
        document.getElementById("LoadProgress").innerHTML=""
        let self=this
        this.scene=scene
        window.save=(data,name)=>{
            self.saveJson(data,name?name:"test.json")
        }
        
        this.config=window.configALL.src.Building_new
        this.NumberOfComponents=this.config.NumberOfComponents

        this.parentGroup = new THREE.Group()
        // var k0=10
        // this.parentGroup.scale.set(
        //     this.config.parentGroup.scale.x*k0,
        //     this.config.parentGroup.scale.y*k0,
        //     this.config.parentGroup.scale.z*k0
        // )
        scene.add(this.parentGroup)
        // this.test()
        // return
        this.meshes={}
        window.meshes=this.meshes
        this.meshes_info={}

        this.detection=new Detection(this.meshes)
        
        this.p2p=new P2P(camera,this.detection)
        this.p2p.parse=message=>{self.p2pParse(message)}
        this.loaderZip=new THREE.LoadingManager()
        self.loadConfigInstance(()=>{
            self.loadConfigIndirect(()=>{
                self.start(camera)
            })
        })
        new Tool(this)
    }
    test(){
        const sphereGeometry = new THREE.SphereGeometry(3, 32, 32);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.parentGroup.add(sphere)
        var self=this
        const loader = new GLTFLoader();
        loader.load("cube.glb", gltf=>{
            // console.log(id)
            var arr=gltf.scene.children
            for(let i=0;i<arr.length;i++){
                arr[i].material.transparent=true
                arr[i].material.opacity=0.1
            }
            gltf.scene.traverse(o=>{
                if(o instanceof THREE.Mesh){                    
                    // self.addMesh(id,o)
                }
            })
            self.parentGroup.add(gltf.scene)
            
        }, undefined, function (error) {
            console.error(error);
        });
    }
    loadConfigInstance(cb){
        const self=this
        const matrix2str=instanceMatrix=>{
            let str=""
            console.log(instanceMatrix.length,"instanceMatrix.length")
            for(let i=0;i<Object.keys(instanceMatrix).length;i++){
                const group=instanceMatrix[""+i]
                str+="["
                for(let j=0;j<group.length;j++){
                    const mesh=group[j]
                    str+=("[")
                    for(let k=0;k<12;k++){
                        str+=(mesh[k])
                        if(k<12-1)str+=(", ")
                    }
                    str+=("]")
                    if(j<group.length-1)str+=(", ")
                }
                str+="], "
            }
            console.log(str)
            self.saveStr(str,"matrices_all.json")
        }
        if(this.config.instanceUse){
            this.parentGroup2=new THREE.Group()//用于Lod
            this.parentGroup.add(this.parentGroup2)
            this.loadJson(
                this.config.path+"info.json",
                data=>{
                    self.instance_info=data.instanceMatrix
                    self.colorList=data.colorList
                    if(false)matrix2str(data.instanceMatrix)
                    cb()
                }
            )
        }else cb()
    }
    loadConfigIndirect(cb){
        if(this.config.useIndirectMaterial){
            IndirectMaterial.pre(()=>{
                cb()
            })
        }else cb()
    }
    start(camera){
        console.log(camera)
        const self=this
        // this.load0()
        // IndirectMaterial.pre(()=>{
        //     camera.position.set(0,0,0)
        //     self.load("sponza")
        // })
        // return
        this.visibiity=new Visibility(
            camera,
            list=>self.loading(list),
            this.meshes,
            this.detection
        )

        // const l1=Array.from(Array(100)).map((v,i) => {return i } )
        // const l2=Array.from(Array(100)).map((v,i) => {return i+100 } )
        // const l3=Array.from(Array(100)).map((v,i) => {return i+200 } )
        // const l4=Array.from(Array(100)).map((v,i) => {return i+300 } )
        // const l5=Array.from(Array(100)).map((v,i) => {return i+400 } )
        // const l6=Array.from(Array(29)).map((v,i) => {return i+500 } )
        // setTimeout(()=>{self.loading(l1)},1000)
        // setTimeout(()=>{self.loading(l2)},2000)
        // setTimeout(()=>{self.loading(l3)},3000)
        // setTimeout(()=>{self.loading(l4)},4000)
        // setTimeout(()=>{self.loading(l5)},5000)
        // setTimeout(()=>{self.loading(l6)},6000)
    }
    createFloor(){
        const geometry = new THREE.BoxGeometry( 1000000, 500, 50000 );
        const material = new THREE.MeshPhongMaterial( {color: 0x654321} );
        const floor = new THREE.Mesh( geometry, material );
        window.floor=floor
        this.parentGroup.add( floor );
    }
    doorTwinkle(){
        const self=this
        let flag=false
        setInterval(()=>{
            for(let id in self.meshes){
                if(self.meshes[id].visible)
                if(self.meshes[id].name.split("FM甲").length>1){//if(self.config.isdoor[""+id]==1){
                    const color=self.meshes[id].material.color
                    if(flag){
                        if(color.r>0.6)color.r-=0.5
                        if(color.g>0.6)color.g-=0.5
                        if(color.b>0.6)color.b-=0.5
                    }else{
                        color.r+=0.5
                        color.g+=0.5
                        color.b+=0.5
                    }
                    // self.meshes[id].visible=!self.meshes[id].visible
                }                  
            }
            flag=!flag 
        },500)
    }
    getInstancedMesh(geometry,material,instance_info){
        const mesh=new THREE.InstancedMesh(
            geometry,
            material,
            instance_info.length+1
        )
        for(let i=0;i<instance_info.length;i++){
            const mat=instance_info[i]
            mesh.setMatrixAt(
                i,
                new THREE.Matrix4().set(
                    mat[0], mat[1], mat[2], mat[3],
                    mat[4], mat[5], mat[6], mat[7],
                    mat[8], mat[9], mat[10], mat[11],
                    0, 0, 0, 1
                )
            )
        }
        mesh.setMatrixAt(
            instance_info.length,
            new THREE.Matrix4().fromArray( [
                1,0,0,0,
                0,1,0,0,
                0,0,1,0,
                0,0,0,1
            ] )
        )
        return mesh
    }
    addMesh(id,mesh){
        //if(false)if(id!==194&&id!=175&&id!=174&&id!=171&&id!=29)
        if(this.config.updateColor){
            mesh.geometry.computeVertexNormals()
            let t=id*256*256*256/8431 ///2665
            mesh.material.color.r=0.5*((t&0xff)    )/255
            mesh.material.color.g=0.5*((t&0xff00)>>8 )/255
            mesh.material.color.b=0.5*((t&0xff0000)>>16)/255
        }else{
            mesh.geometry.computeVertexNormals()
            // mesh.material.depthTest=true
            mesh.material.depthWrite=true
            // mesh.material.transparent=false
            mesh.material.side=0//THREE.DoubleSide
        }
        // if(mesh.material.transparent)console.log(id)
        // mesh.material=new THREE.MeshStandardMaterial({
        //     color:mesh.material.color ,
        //     map:mesh.material.map,

        //     bumpScale: 1,
        //     displacementBias:0,
        //     displacementScale: 1,

        //     emissiveIntensity: 1,
        //     envMapIntensity:1,
        //     metalness: 0.5,
        //     roughness: 0.5,
        //     // shininess:300,
        // })
        // mesh.material.side=2
        const underground=this.InY2(mesh,15)
        if(underground&&id!=194){//if(id==171||id==174){
            // console.log(id)
            // mesh.material.color.r=1
            mesh.material.metalness=0.5
            mesh.material.roughness=0
            mesh.material.envMapIntensity=0
            mesh.material.color.r=mesh.material.color.g=mesh.material.color.b=0.8
        }
        mesh.underground=underground
        mesh.material.metalness0=mesh.material.metalness//-0.5
        mesh.material.roughness0=mesh.material.roughness//-0.5
        mesh.material.envMapIntensity0=mesh.material.envMapIntensity//-0.5
        mesh.material.emissiveIntensity0=mesh.material.emissiveIntensity//-0.5
        // console.log(mesh.material.color.r+mesh.material.color.g+mesh.material.color.b)
        
        // mesh.material.shininess = 10;
        
        if(this.instance_info){
            const meshOld=mesh
            mesh.materialOld=mesh.material
            
            const mesh0=mesh
            const instance_info=this.instance_info[id]
            const geometry=mesh.geometry
            const mesh2=this.getInstancedMesh(
                geometry,
                mesh.material,
                instance_info)
            mesh2.visible=false
            mesh2.underground=underground
            mesh=this.getInstancedMesh(
                geometry,
                new THREE.MeshStandardMaterial({
                    color:this.colorList[id] ,
                    map:null,
        
                    bumpScale: 1,
                    displacementBias:0,
                    displacementScale: 1,
                    emissiveIntensity: mesh.material.emissiveIntensity,//1,
                    envMapIntensity:mesh.material.envMapIntensity,//1,
                    metalness: mesh.material.metalness,//0.95,
                    roughness: mesh.material.roughness//0.1+0.4,
                    // shininess:300,
                }),
                instance_info)
            mesh.castShadow = true
            mesh.receiveShadow = true
            mesh.underground=underground
            mesh2.castShadow = true
            mesh2.receiveShadow = true
            //////////
            if(this.config.useIndirectMaterial){
                mesh.material1=mesh.material
                mesh2.material1=mesh2.material
                mesh.material2=
                mesh2.material2=new IndirectMaterial(mesh.material)
            }
            // mesh2.material=mesh.material=mesh.material2
            
            ///////////////
            mesh.lod=[mesh,mesh2]
            if(id==194)mesh.lod=[mesh,mesh]
            // mesh.lod=[mesh,mesh]
            // mesh.visible=false
            if(false)if(this.config.waterCidList){
                for(let i=0;i<this.config.waterCidList.length;i++)
                    if(id==this.config.waterCidList[i]){
                        var water = new WaterController(meshOld).water
                        mesh.visible=mesh2.visible=false
                        mesh.lod=[water,water]
                        if(true)this.parentGroup2.add(water)
                    }
            }
            this.parentGroup2.add(mesh2)
            mesh.used      =mesh0.used
            mesh.LoadDelay =mesh0.LoadDelay
            mesh.originType=mesh0.originType
            mesh.delay     =mesh0.delay
            mesh.config0=this.meshes_info[id]
        }
        const self=this
        setTimeout(()=>{
            self.meshes[id]=mesh
        },1000)
        this.parentGroup.add(mesh)
        this.visibiity.prePoint2=""//重新进行可见剔除

        mesh.myId=id
        this.detection.receiveMesh(mesh)   
    }
    loadGLB(id,cb){
        if(this.meshes_info[id])return
        this.meshes_info[id]={request:performance.now()}//true
        this.detection.request("glb")
        var self=this
        const loader = new GLTFLoader();
        loader.load(self.config.path+id+".glb", gltf=>{
            // console.log(id)
            gltf.scene.traverse(o=>{
                if(o instanceof THREE.Mesh){                    
                    self.addMesh(id,o)
                }
            })
            if(cb)cb()
        }, undefined, function (error) {
            console.error(error);
        });
    }
    loadZip_test(id,cb){
        if(this.meshes_info[id])return
        this.detection.receivePack("server")
        this.meshes_info[id]={request:performance.now()}//请求
        this.detection.request("zip")
        const self=this
        var url=self.config.path+id+".zip"
	    const zipLoader=new ZipLoader()
		zipLoader.load( 
            url,
            ()=>{},
            ()=>{}).then( ( zip )=>{//解析压缩包
                self.meshes_info[id].loaded=performance.now()//加载完成
                // new ZipLoader().parse(zipLoader.baseUrl,zipLoader.buffer).then( ( zip )=>{//解析压缩包
                //     self.loaderZip.setURLModifier( zip.urlResolver );//装载资源
                //     const loader = new GLTFLoader(self.loaderZip);
                //     loader.load(zip.find( /\.(gltf|glb)$/i )[0], () => {
                //         self.meshes_info[id].parsed=performance.now()//解析完成
                //         self.meshes[id]={"config0":self.meshes_info[id]}
                //     });
                // },()=>{});
                new Promise( function ( resolve, reject ) {
                    new THREE.TextureLoader().load( 
                    'assets/textures/test/0.png',
                    ()=>{
                        self.meshes_info[id].parsed=performance.now()//解析完成
                        self.meshes[id]={"config0":self.meshes_info[id]}
                    } );
                })
                
		    });
    }
    loadZip_test2(id,cb){
        if(this.meshes_info[id])return
        this.detection.receivePack("server")
        this.meshes_info[id]={request:performance.now()}//请求
        this.detection.request("zip")
        const self=this
        var url=self.config.path+id+".zip"
        var url=self.config.path+"0.zip"
	    const zipLoader=new ZipLoader()
		zipLoader.load( 
            url,
            ()=>{},
            ()=>{}).then( ( zip )=>{//解析压缩包
                self.meshes_info[id].loaded=performance.now()//加载完成
                new Promise( function ( resolve, reject ) {
                    new THREE.TextureLoader().load( 
                        'assets/textures/test/'+id+'.png',
                    ()=>{
                        console.log(id)
                        self.meshes_info[id].parsed=performance.now()//解析完成
                        self.meshes[id]={"config0":self.meshes_info[id]}
                    } );
                })
                
		    });
    }
    loadZip(id,cb){
        if(this.meshes_info[id])return
        this.detection.receivePack("server")
        this.meshes_info[id]={request:performance.now()}//true
        this.detection.request("zip")
        const self=this
        var url=self.config.path+id+".zip"
	    new Promise( function( resolve, reject ) {//加载资源压缩包
            const zipLoader=new ZipLoader()
            if(self.config.crossOriginSocket&&self.config.crossOriginSocket.length>0){
                const i=Math.floor(Math.random()*self.config.crossOriginSocket.length)
                zipLoader.crossOriginSocket=self.config.crossOriginSocket[i]
                console.log(zipLoader.crossOriginSocket)
            }
		    zipLoader.load( url,()=>{
		    },()=>{
			    console.log("加载失败："+id)
			    setTimeout(()=>{//重新请求
			    },1000*(0.5*Math.random()+1))//1~1.5秒后重新加载
		    }).then( ( zip )=>{//解析压缩包
                self.meshes_info[id].loaded=performance.now()//加载完成
                self.p2p.send({
                    cid:id,
                    baseUrl:zipLoader.baseUrl,
                    buffer:zipLoader.buffer
                })
                self.meshes_info[id].forwarded=performance.now()//转发完成
                new ZipLoader().parse(zipLoader.baseUrl,zipLoader.buffer).then( ( zip )=>{//解析压缩包
                    self.loaderZip.setURLModifier( zip.urlResolver );//装载资源
                    resolve({//查看文件是否存在？以及路径
                        fileUrl: zip.find( /\.(gltf|glb)$/i )
                    });
                },()=>{});
		    });
	    } ).then( function ( configJson ) {
		    const loader = new GLTFLoader(self.loaderZip);
		    loader.load(configJson.fileUrl[0], (gltf) => {
                // self.p2p.send({cid:id,myArray:loader.myArray})
                self.meshes_info[id].parsed=performance.now()//解析完成
                gltf.scene.traverse(o=>{
                    if(o instanceof THREE.Mesh){  
                        o.delay={
                            load   :self.meshes_info[id].loaded   -self.meshes_info[id].request,  //加载延迟
                            forward:self.meshes_info[id].forwarded-self.meshes_info[id].loaded,   //转发延迟
                            parse  :self.meshes_info[id].parsed   -self.meshes_info[id].forwarded,//解析延迟
                            
                            parsed :self.meshes_info[id].parsed,//解析完成的时刻
                        }
                        
                        o.LoadDelay   =self.meshes_info[id].loaded   -self.meshes_info[id].request
                        o.originType="centerServer"
                        // if(!o.material.map)console.log(779)
                        self.addMesh(id,o)
                    }
                })
                if(cb)cb()
		    });
	    } );
    }
    p2pParse(message){
        this.detection.receivePack("p2p")
        const cid=message.cid
        if(this.meshes_info[cid])return
		else this.meshes_info[cid]={request:performance.now()}
        const self=this
		new Promise( function( resolve, reject ) {//加载资源压缩包
            new ZipLoader().parse(message.baseUrl,message.buffer).then( ( zip )=>{//解析压缩包
                self.loaderZip.setURLModifier( zip.urlResolver );//装载资源
                resolve({//查看文件是否存在？以及路径
                    fileUrl: zip.find( /\.(gltf|glb)$/i )
                });
            },()=>{});
	    } ).then( function ( configJson ) {
		    const loader = new GLTFLoader(self.loaderZip);
		    loader.load(configJson.fileUrl[0], (gltf) => {
                gltf.scene.traverse(o=>{
                    if(o instanceof THREE.Mesh){    
                        o.LoadDelay   =0
                        o.delay={
                            load   :0,
                            forward:0,
                            parse  :performance.now()-self.meshes_info[cid].request,

                            parsed :self.meshes_info[id].parsed,//解析完成的时刻
                        }
                        o.originType="edgeP2P"
                        self.addMesh(cid,o)
                    }
                })
		    });
	    } );
    }
    load(name){
        const self=this
        const path=self.config.path+name+".glb"
        console.log(path)
        const loader = new GLTFLoader();
        loader.load(self.config.path+name+".glb", gltf=>{
            gltf.scene.traverse(o=>{
                if(o instanceof THREE.Mesh){                    
                    // self.scene.add(id,o)
                    // console.log(o.material)
                    o.material=new IndirectMaterial(o.material)
                    // o.material.Json2DataTexture()
                }
            })
            console.log(gltf.scene)
            self.scene.add(gltf.scene)
            // if(cb)cb()
        }, undefined, function (error) {
            console.error(error);
        });
    }
    load0(){
        const self=this
        loadAll(0)
        function loadAll(index){
            self.loadZip(index,()=>{
                setTimeout(()=>{
                    if(index+1<self.NumberOfComponents)
                        loadAll(index+1)
                },100)
            })
        }
    }
    loading(list){
        // for(let i=0;i<30;i++)this.loadZip(i)
        // return
        const self=this;
        window.list=list
        const NUMBER=this.config.NUMBER?this.config.NUMBER:30//50//350//50//50
        const TIME=this.config.TIME?this.config.TIME:1200//100
        window.NUMBER=NUMBER
        window.TIME0=TIME
        
        for(let i=0;i<NUMBER&&i<list.length;i++){
            // if(!this.meshes_info[list[i]])console.log("第"+(i+1)+"次请求(第1批),构件编号"+list[i])
            this.loadZip(list[i])
        }
        // if(!window.flag000){
        //     console.log("完成第一批请求")
        //     window.flag000=true
        // }
        setTimeout(()=>{
            for(let i=NUMBER;i<list.length;i++){
                // if(!self.meshes_info[list[i]])console.log("第"+(i+1)+"次请求(第2批),构件编号"+list[i])
                self.loadZip(list[i])
            }
            // if(!window.flag001){
            //     console.log("完成第二批请求")
            //     window.flag001=true
            // }
        },TIME)
    }
    saveStr(str,name){
        var myBlob=new Blob([str], { type: 'text/plain' })
        let link = document.createElement('a')
        link.href = URL.createObjectURL(myBlob)
        link.download = name
        link.click()
    }
    saveJson(data,name){
        const jsonData = JSON.stringify(data);//JSON.stringify(data, null, 2); // Convert JSON object to string with indentation
        
        const myBlob = new Blob([jsonData], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(myBlob)
        link.download = name
        link.click()
    }
    InY2(mesh,y0){
        var box = new THREE.Box3().setFromObject(mesh)
        return box.max.y<y0//return box.min.y<ymax && box.max.y>ymin //&&box.max.z>-7766
    }
    loadJson(path,cb){
        console.log(path)
        var xhr = new XMLHttpRequest()
        xhr.open('GET', path, true)
        xhr.send()
        xhr.onreadystatechange = ()=> {
            if (xhr.readyState == 4 && xhr.status == 200) {
                var json_data = JSON.parse(xhr.responseText)
                cb(json_data)
            }
        }
    }
}
class Tool{
    constructor(building){    
        const self=this
        this.building=building
        this.raycaster =new THREE.Raycaster();
        window.test1=()=>{
            self.rayCasterList()
        }
        window.test2=()=>{
            // const mesh = new THREE.Mesh(
            //     new THREE.BoxGeometry(4, 4, 4),//(10, 10, 10),
            //     new THREE.MeshBasicMaterial({ color: 0x00ff00 })
            // ); 
            // mesh.position.set(0,10,0)//(0,80,0)
            // self.building.parentGroup.add(mesh)

            const arr=this.getMeshList()
            const r=self.rayCaster(
                new THREE.Vector3(0,80,0),
                new THREE.Vector3(0,-100,0),
                arr
            )
            console.log(r,"r")
            
        }
        
    }
    getMeshList(){
        const arr0=this.building.parentGroup.children
        const arr1=[]
        for(let i=0;i<arr0.length;i++){
            const mesh=arr0[i]
            if(mesh instanceof THREE.Mesh){
                const mesh1=new THREE.Mesh(
                    mesh.geometry,
                    mesh.material
                )
                mesh1.myId=mesh.myId
                // arr1.push(mesh)
                arr1.push(mesh1)
            }
                
        }
        return arr1
    }
    rayCaster(origin , direction,arr){
        //const arr=this.getMeshList()//this.building.parentGroup.children
        const raycaster=this.raycaster
        raycaster.set(origin , direction)
        const intersects = raycaster.intersectObjects(arr);
        if (intersects.length > 0) {
               return intersects[0].object
        } else {
               return null
        }
    }
    rayCasterList(){
        for(let i=0;i<this.building.parentGroup.children.length;i++){
            this.building.parentGroup.children[i].visible=true
        }
        const arr=this.getMeshList()
        const result=[]
        const direction=new THREE.Vector3(0,-100,0)
        const n=150
        const m=150
        const pos={}
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                const x=(i-n/2) * 10
                const z=(j-m/2) * 10
                const r=this.rayCaster(
                    new THREE.Vector3(
                        (i-n/2) * 10, 
                        80, 
                        (j-m/2) * 10),
                    direction,
                    arr
                )
                if(r){
                    const id=r.myId
                    if(!pos[id]){
                        pos[id]=[]   
                    }
                    pos[id].push(x)
                    pos[id].push(z)
                    // result.push([r,x,z])
                }
                    
            }
            console.log(n,i+1)
        }
        console.log("pos",pos)
        this.saveJson(pos,"pos.json")
    }
    instance(){
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

        // 创建实例化方块
        const n=150
        const m=150
        const instances = new THREE.InstancedMesh(geometry, material, n*m); // 创建10个实例
        // 设置实例化方块的位置
        for (let i = 0; i < n; i++) 
        for (let j = 0; j < m; j++) {
            const matrix = new THREE.Matrix4();
            matrix.setPosition(new THREE.Vector3(
                (i-n/2) * 10, 
                80, //10
                (j-m/2) * 10));
            instances.setMatrixAt(i*m+j, matrix);
        }
        return instances
    }
    saveJson(data,name){
        const jsonData = JSON.stringify(data);//JSON.stringify(data, null, 2); // Convert JSON object to string with indentation
        
        const myBlob = new Blob([jsonData], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(myBlob)
        link.download = name
        link.click()
    }
}