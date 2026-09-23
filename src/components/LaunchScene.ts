import * as THREE from 'three';
import {launchFrame} from '../launch-timeline';

/** A short-lived cinematic layer in the existing renderer. All resources are
 * disposed when the intro ends, including an early skip or reminder. */
export class LaunchScene {
 readonly group=new THREE.Group();
 private geometries:THREE.BufferGeometry[]=[];
 private materials:THREE.Material[]=[];
 private gates:THREE.Group[]=[];
 private rings:THREE.Mesh[]=[];
 private beams:THREE.Mesh;
 private stars:THREE.Points;
 private halo:THREE.Mesh;
 private nebula:THREE.Mesh;
 private metal:THREE.MeshStandardMaterial;
 private rim:THREE.MeshBasicMaterial;
 private edge:THREE.MeshBasicMaterial;
 constructor(){
  const track=<T extends THREE.BufferGeometry>(g:T)=>{this.geometries.push(g);return g;};
  const material=<T extends THREE.Material>(m:T)=>{this.materials.push(m);return m;};
  this.metal=material(new THREE.MeshStandardMaterial({color:0x1d354e,metalness:.8,roughness:.36,transparent:true,opacity:1}));
  this.rim=material(new THREE.MeshBasicMaterial({color:0x91e9ff,transparent:true,opacity:.95}));
  const edge=this.edge=material(new THREE.MeshBasicMaterial({color:0x256784,transparent:true,opacity:.75}));
  const ambient=new THREE.AmbientLight(0x608bbc,2),light=new THREE.DirectionalLight(0xccefff,4);light.position.set(20,50,90);this.group.add(ambient,light);
  const coreGeo=track(new THREE.TorusGeometry(43,1.8,8,128)),rimGeo=track(new THREE.TorusGeometry(40,.2,5,160)),outerGeo=track(new THREE.TorusGeometry(49,.32,5,160));
  const blockGeo=track(new THREE.BoxGeometry(3.4,7,3.2)),barGeo=track(new THREE.BoxGeometry(.35,4.8,.4));
  const dummy=new THREE.Object3D();
  for(let n=0;n<8;n++){
   const gate=new THREE.Group();gate.position.z=-100-n*105;this.gates.push(gate);this.group.add(gate);
   gate.add(new THREE.Mesh(coreGeo,this.metal),new THREE.Mesh(rimGeo,this.rim),new THREE.Mesh(outerGeo,edge));
   const blocks=new THREE.InstancedMesh(blockGeo,this.metal,32),bars=new THREE.InstancedMesh(barGeo,this.rim,64);
   for(let i=0;i<64;i++){const angle=i/64*Math.PI*2;dummy.position.set(Math.cos(angle)*46,Math.sin(angle)*46,0);dummy.rotation.set(0,0,angle-Math.PI/2);dummy.updateMatrix();bars.setMatrixAt(i,dummy.matrix);if(i%2===0)blocks.setMatrixAt(i/2,dummy.matrix);}
   gate.add(blocks,bars);
  }
  // Incomplete concentric arcs give the destination an engineered silhouette.
  const arcGeo=track(new THREE.TorusGeometry(56,.3,5,140,Math.PI*1.4));
  for(let i=0;i<3;i++){const ring=new THREE.Mesh(arcGeo,i===0?this.rim:edge);ring.position.z=-910-i*12;ring.scale.setScalar(1+i*.18);ring.rotation.z=i*2.1;this.rings.push(ring);this.group.add(ring);}
  const plane=track(new THREE.PlaneGeometry(1,1));
  const glow=material(new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uEnergy:{value:0},uFade:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float uEnergy;uniform float uFade;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float ring=exp(-abs(r-.36)*50.);float aura=exp(-r*r*5.)*.22;float beam=exp(-abs(p.y)*95.)*exp(-abs(p.x)*1.8)*.4;float a=(ring*.6+aura+beam)*uEnergy*uFade;gl_FragColor=vec4(.20,.63,.95,a);}`}));
  this.halo=new THREE.Mesh(plane,glow);this.halo.scale.set(350,350,1);this.halo.position.z=-930;this.group.add(this.halo);
  const space=material(new THREE.ShaderMaterial({depthWrite:false,transparent:true,uniforms:{uTime:{value:0},uFade:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float uTime;uniform float uFade;
  void main(){vec2 p=vUv-.5;float r=length(p);float a=atan(p.y,p.x);float band=exp(-pow((p.y+sin(p.x*8.+uTime*.04)*.08)*5.,2.));float cloud=sin(p.x*15.+sin(p.y*19.))*sin(p.y*12.-p.x*7.);float mist=band*(.11+.065*cloud);vec3 c=mix(vec3(.008,.02,.065),vec3(.035,.15,.23),mist*3.);c+=vec3(.035,.035,.13)*pow(max(0.,sin(a*2.+r*13.)),3.)*exp(-r*4.);gl_FragColor=vec4(c,uFade);}`}));
  this.nebula=new THREE.Mesh(plane,space);this.nebula.scale.set(2500,1600,1);this.nebula.position.z=-1200;this.group.add(this.nebula);
  const geometry=track(new THREE.BufferGeometry()),pos:number[]=[],offset:number[]=[],length:number[]=[],speed:number[]=[];
  let seed=7391;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<700;i++){const angle=random()*Math.PI*2,radius=24+random()*135,x=Math.cos(angle)*radius,y=Math.sin(angle)*radius,z=random()*1000,len=5+random()*24,s=30+random()*90,width=.025+random()*.11;
   for(const [u,v]of [[-1,0],[1,0],[1,1],[-1,0],[1,1],[-1,1]]){pos.push(u*width,0,v);offset.push(x,y,z);length.push(len);speed.push(s);}}
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('aOffset',new THREE.Float32BufferAttribute(offset,3));geometry.setAttribute('aLength',new THREE.Float32BufferAttribute(length,1));geometry.setAttribute('aSpeed',new THREE.Float32BufferAttribute(speed,1));
  const beamMat=material(new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uTravel:{value:0},uBoost:{value:0},uFade:{value:1}},vertexShader:`attribute vec3 aOffset;attribute float aLength;attribute float aSpeed;uniform float uTime;uniform float uTravel;uniform float uBoost;varying float vAlpha;void main(){vec3 p=position;p.z*=aLength*(1.+uBoost*3.);p.xy+=aOffset.xy;p.z+=80.-mod(aOffset.z-uTime*aSpeed-uTravel+2000.,1000.);vAlpha=(.25+uBoost*.65)*(1.-smoothstep(400.,1000.,-p.z));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:'varying float vAlpha;uniform float uFade;void main(){gl_FragColor=vec4(.38,.79,1.,vAlpha*uFade);}'}));
  this.beams=new THREE.Mesh(geometry,beamMat);this.beams.frustumCulled=false;this.group.add(this.beams);
  const starGeo=track(new THREE.BufferGeometry()),vertices=new Float32Array(3000*3);for(let i=0;i<vertices.length;i+=3){vertices[i]=(random()-.5)*1250;vertices[i+1]=(random()-.5)*850;vertices[i+2]=-random()*1000;}
  starGeo.setAttribute('position',new THREE.BufferAttribute(vertices,3));const starMat=material(new THREE.PointsMaterial({color:0xb1dfff,size:.65,transparent:true,opacity:.9,depthWrite:false}));this.stars=new THREE.Points(starGeo,starMat);this.group.add(this.stars);
 }
 update(elapsed:number,camera:THREE.PerspectiveCamera,tier:number){
  const f=launchFrame(elapsed),time=elapsed/1000;
  this.group.visible=f.fade>0;
  this.metal.opacity=f.fade;this.rim.opacity=(.3+f.charge*.65)*f.fade;this.edge.opacity=.75*f.fade;
  camera.position.set(Math.sin(f.flight*Math.PI)*5,Math.sin(f.flight*Math.PI)*-2,60-f.travel);
  camera.up.set(Math.sin(f.roll),Math.cos(f.roll),0);camera.lookAt(0,0,camera.position.z-300);camera.fov=f.fov;camera.updateProjectionMatrix();
  this.gates.forEach((g,i)=>{g.rotation.z=time*(i%2?-.075:.06);g.visible=g.position.z<camera.position.z+50&&f.fade>0;});
  this.rings.forEach((r,i)=>r.rotation.z=i*2.1+time*(i%2?.16:-.12));
  const beams=this.beams.material as THREE.ShaderMaterial;beams.uniforms.uTime.value=time;beams.uniforms.uTravel.value=f.travel;beams.uniforms.uBoost.value=f.boost;beams.uniforms.uFade.value=f.fade;this.beams.position.z=camera.position.z-60;this.beams.geometry.setDrawRange(0,tier>=1?1800:4200);
  const glow=this.halo.material as THREE.ShaderMaterial;glow.uniforms.uEnergy.value=(.3+f.charge*.7)*(tier>=3?.45:1);glow.uniforms.uFade.value=f.fade;
  const nebula=this.nebula.material as THREE.ShaderMaterial;nebula.uniforms.uTime.value=time;nebula.uniforms.uFade.value=f.fade;
  this.stars.geometry.setDrawRange(0,tier>=1?1000:3000);(this.stars.material as THREE.PointsMaterial).opacity=f.fade*.9;
  // Cool-lit structure reveals before travel, then recedes for the wordmark.
  this.nebula.position.z=camera.position.z-1100;
  return f;
 }
 dispose(){this.group.removeFromParent();for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();}
}
