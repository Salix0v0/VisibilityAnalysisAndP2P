import config from '../../config/configOP.json'
export class P2P{
    constructor(camera){
        this.useP2P=true
        if(new URLSearchParams(window.location.search).has("useP2P"))
            this.useP2P=new URLSearchParams(window.location.search).get('useP2P')=="true"
        console.log("useP2P:",this.useP2P)
        window.useP2P=this.useP2P
        if(!new URLSearchParams(window.location.search).has("autoMove"))
            if(this.useP2P)alert("使用P2P")
            else alert("不用P2P")
        this.camera=camera
        this.parse=data=>console.log(data)
        this.socketURL=config.src.P2P.urlP2pControllerServer//"http://114.80.207.60:8011"//this.urlP2pServer
        console.log("this.socketURL",this.socketURL)
        const self=this
        if(this.useP2P){
            this.geolocation(location=>{
                self.init_p2p_controller(self.socketURL,location)
            })
        }
    }
    geolocation(cb){
        cb(null);return
        var geolocation = new BMap.Geolocation();
        geolocation.getCurrentPosition(function(r){
            const status=this.getStatus()
            let location
            if( status== BMAP_STATUS_SUCCESS){
                location= [r.point.lat,r.point.lng]
            }else {
                console.log('failed'+status)
                location= [31,121]//上海
            }
            if(cb)cb(location)
        },{enableHighAccuracy: true})        
    }
    init_p2p_controller(socketURL,location){
        console.log("location:",location)
        var scope=this
        var socket = io.connect(socketURL,{transports:['websocket','xhr-polling','jsonp-polling']})
        socket.emit('addUser',{
            feature:[scope.camera.position.x,scope.camera.position.y,scope.camera.position.z]
        })
        socket.on('userConfig',  data=> {
            scope.config=data
            const edgeURL="http://"+data.edgeIp+":8011"
            this.socket = this.init_p2p_edge(edgeURL)
        })
        socket.on('userConfigUpdate',  data=> {
            scope.config=data
            // const edgeURL="http://"+data.edgeIp+":8011"
            console.log(data)
            scope.socket.emit("groupId",scope.config.groupId)
        })
        setInterval(()=>{
            socket.emit('updateFeature',{
                feature:[scope.camera.position.x,scope.camera.position.y,scope.camera.position.z]
            })
        },10*1000)//每隔10s更新一次特征
    }
    updateGroupId(groupId){
        this.config.groupId=groupId
        this.socket.emit("groupId",this.config.groupId)
    }
    init_p2p_edge(socketURL){
        var scope=this
        var socket = io.connect(socketURL,{transports:['websocket','xhr-polling','jsonp-polling']})
        socket.emit("groupId",scope.config.groupId)
        socket.on('edge2client',  data=> {
            scope.parse(data)
        })
        return socket
    }
    send(message){
        if(this.useP2P&&this.socket){
            message.groupId=this.config.groupId
            this.socket.emit('client2edge',message)
        }
            
    }
}