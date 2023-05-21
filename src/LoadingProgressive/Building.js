import * as THREE from "three"
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import {OBJExporter} from "three/examples/jsm/exporters/OBJExporter"
import { saveAs } from 'file-saver'
import { Visibility } from './Visibility.js'
import { P2P } from './P2P.js'
import { Detection } from './Detection.js'
import {ZipLoader } from '../../lib/zip/Ziploader'
import { IndirectMaterial } from '../../lib/threejs/IndirectMaterial'
import { WaterController  } from '../../lib/threejs/WaterController'
export class Building{
    constructor(scene,camera){
        document.getElementById("LoadProgress").innerHTML=""
        let self=this
        this.scene=scene
        
        this.config=window.configALL.src.Building_new
        this.NumberOfComponents=this.config.NumberOfComponents

        this.parentGroup = new THREE.Group()
        this.parentGroup.scale.set(
            this.config.parentGroup.scale.x,
            this.config.parentGroup.scale.y,
            this.config.parentGroup.scale.z
        )
        scene.add(this.parentGroup)
        this.meshes={}
        window.meshes=this.meshes
        this.meshes_info={}

        this.detection=new Detection(this.meshes)
        
        this.p2p=new P2P(camera,this.detection)
        this.p2p.parse=message=>{self.p2pParse(message)}
        this.loaderZip=new THREE.LoadingManager()
        
        self.loadConfigInstance(()=>{
            self.loadConfigIndirect(()=>{
                self.start()
            })
        })
    }
    loadConfigInstance(cb){
        const self=this
        const matrix2str=(instanceMatrix)=>{
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
                    console.log(data)
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
    start(){
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
            mesh.material.transparent=false
            mesh.material.side=0//THREE.DoubleSide
        }
        if(true){
            // mesh.material.color.r/=2
            // mesh.material.color.g/=2
            // mesh.material.color.b/=2
            mesh.material.metalness=0.25
            // console.log(
            //     mesh.material.metalness,
            //     mesh.material.shininess
            // )
        }
        if(false)mesh.material=new THREE.MeshBasicMaterial({color:id})
        if(this.config.useIndirectMaterial){
            mesh.material=new IndirectMaterial(mesh.material)
        }
        // console.log("THREE.DoubleSide",THREE.DoubleSide)
 
        // mesh.material.color.r=mesh.material.color.g=mesh.material.color.b=((t&0xff))/255
        // mesh.geometry.computeVertexNormals()
        // mesh=new THREE.Mesh(
        //     mesh.geometry,
        //     new THREE.MeshBasicMaterial()
        // )
        // let t=id*256*256*256/259 ///2665
        // mesh.material.color.r=1.*((t&0xff)    )/255
        // mesh.material.color.g=1.*((t&0xff00)>>8 )/255
        // mesh.material.color.b=1.*((t&0xff0000)>>16)/255
        if(this.instance_info){
            const meshOld=mesh
            mesh.materialOld=mesh.material
            const color=this.colorList[id]
            const mesh0=mesh
            const instance_info=this.instance_info[id]
            const geometry=mesh.geometry
            const mesh2=this.getInstancedMesh(geometry,mesh.material,instance_info)
            mesh2.visible=false
            mesh=this.getInstancedMesh(
                geometry,
                new THREE.MeshStandardMaterial({ 
                    color:color ,
                    metalness: 0.5
                }),
                instance_info)
            mesh.lod=[mesh,mesh2]
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
        }

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
        const self=this;
        for(let i=0;i<50&&i<list.length;i++){
            this.loadZip(list[i])
        }
        setTimeout(()=>{
            for(let i=50;i<list.length;i++){
                self.loadZip(list[i])
            }
        },100)
    }
    saveStr(str,name){
        var myBlob=new Blob([str], { type: 'text/plain' })
        let link = document.createElement('a')
        link.href = URL.createObjectURL(myBlob)
        link.download = name
        link.click()
    }
    InY(mesh,ymin,ymax){
        var box = new THREE.Box3().setFromObject(mesh)
        // return box.max.y<ymax && box.min.y>ymin
        return box.min.y<ymax && box.max.y>ymin //&&box.max.z>-7766
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
