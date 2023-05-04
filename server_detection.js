const port=9999
let id=0
Date.prototype.Format = function(fmt) { //author: meizz 
    var o = {        
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "h+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "S": this.getMilliseconds() //毫秒 
    };    
    if (/(y+)/.test(fmt)) 
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));    
    for (var k in o)        
        if (new RegExp("(" + k + ")").test(fmt)) 
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));    
    return fmt;
}
function getName(){
    const name=(new Date()).Format("yyyy-MM-dd.hh-mm-ss.")+id+".json"
    id++
    return name
}

//localhost:8080
var data0=""
require('http').createServer(function (request, response) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    request.on('data', function (data) {//接受请求
        data=data.toString()
        try{
            saveJson(JSON.parse(data0))//saveStr(data0)//
        }catch (e) {
            data0=data0+data
            try{
                saveJson(JSON.parse(data0))//saveStr(data0)//
                data0=""
            }catch(e){
                console.log(1,e)
            }
        }
    });
    request.on('end', function () {//返回数据
        response.write("finish");//发送字符串
        response.end();
    });
}).listen(port, '0.0.0.0', function () {
    console.log("Listening port: "+port);
});

function saveJson(json0) {
    var name="detection/"+getName()
    var fs=require('fs')
    try{
        fs.writeFile(name,JSON.stringify(json0 , null, "\t"), function(){});
        // fs.writeFile(name, JSON.stringify(json0 , null, "\t") , function(){});
    }catch (e) {
        console.log(2,e)
    }
}
function saveStr(str0) {
    var name="detection/"+getName()
    var fs=require('fs')
    try{
        fs.writeFile(name,str0, function(){});
    }catch (e) {
        console.log(2,e)
    }
}