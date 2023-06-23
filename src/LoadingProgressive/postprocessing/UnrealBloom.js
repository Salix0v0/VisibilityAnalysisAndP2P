import * as THREE from "three"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { SSAOPass } from   'three/examples/jsm/postprocessing/SSAOPass.js';

import { MyEffectComposer } from "./src/MyEffectComposer.js";

import { MyUnrealBloomPass} from "./src/MyUnrealBloomPass.js";
export class UnrealBloom{
    constructor(camera,scene,renderer){
        this.camera=camera
        this.scene=scene
        this.renderTarget=new THREE.WebGLRenderTarget( window.innerWidth , window.innerHeight )
        this.composer=this.initComposer(renderer)
        // this.composer2=this.initComposer2()
        
    }
    initComposer(renderer){//设置光晕
        console.log(renderer)
        var composer = new MyEffectComposer(renderer)//效果组合器
        composer.addPass(
            new RenderPass(scene, camera)
        );
        composer.addPass(
            this.getSSAO()
        );
        composer.addPass(
            new MyUnrealBloomPass(//创建通道
                new THREE.Vector2(window.innerWidth, window.innerHeight),//参数一：泛光覆盖场景大小，二维向量类型
                0.4,    //参数二：bloomStrength 泛光强度，值越大明亮的区域越亮，较暗区域变亮的范围越广
                2,//0.3,//参数三：bloomRadius 泛光散发半径
                0//0.75//参数四：bloomThreshold 泛光的光照强度阈值，如果照在物体上的光照强度大于该值就会产生泛光
            )
        );
        
        return composer
    }
    getSSAO(){//https://juejin.cn/post/7224683165989732412
        let saoPass = new SSAOPass(this.scene, this.camera, window.innerWidth, window.innerHeight);
        // console.log(SSAOPass.OUTPUT)
        // saoPass.params.output = SSAOPass.OUTPUT.Default;
        // saoPass.params.saoBias = 0.5;
        // saoPass.params.saoIntensity = 0.05;
        // saoPass.params.saoScale = 100;
        // saoPass.params.saoKernelRadius = 10;
        // saoPass.params.saoMinResolution = 0;
        // saoPass.params.saoBlur = true;
        return saoPass
    }
    initComposer2(){//设置光晕
        this.litRenderTarget = new THREE.WebGLRenderTarget(
			window.innerWidth,
			window.innerHeight,
			{
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
			}
		)
        // 最终真正渲染到屏幕上的效果合成器 finalComposer 
        const vs=/* glsl */`
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }`
        const fs=/* glsl */`
            uniform sampler2D baseTexture;
            uniform sampler2D bloomTexture;
            varying vec2 vUv;
            void main() {
                gl_FragColor = 1.0 * texture2D( baseTexture, vUv ) + 0.0 * texture2D( bloomTexture, vUv );
                gl_FragColor.a=1.;
                gl_FragColor.r=1.;
            }`
        const shaderPass = new ShaderPass(
            new THREE.ShaderMaterial({
                uniforms: {//renderTarget1 renderTarget2
                  baseTexture: { value: this.litRenderTarget.texture },
                  bloomTexture: { value: this.composer.renderTarget2.texture },
                },
                vertexShader: vs,
                fragmentShader: fs,
                defines: {},
            }),
            'baseTexture',
        ); // 创建自定义的着色器Pass，详细见下
        shaderPass.needsSwap = true;
            
        const finalComposer = new MyEffectComposer(renderer)
        finalComposer.addPass(shaderPass)
        // finalComposer.render()
        return finalComposer
    }
    render(){
        this.composer.render()
        //this.composer.renderTarget2.texture
        // renderer.clear()
        // this.composer2.render()
    }
    // getTexture(){
    //     renderer.setRenderTarget(this.renderTarget)
    //     this.composer.renderToScreen=false
    //     this.render()
    //     return this.renderTarget.texture
    // }
    getTexture(){
        this.composer.renderToScreen=false
        this.render()
        return this.composer.readBuffer.texture
    }
    getTexture1(){
        this.composer.renderToScreen=false
        this.render()
        return this.composer.renderTarget2.texture
    }
}