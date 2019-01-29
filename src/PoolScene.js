import AutomotonParticles from './AutomotonParticles'
import Stats from 'stats-js'
import {vertexShader, floorFragmentShader, genericFragmentShader, poolFloorFragmentShader} from './RoomShaders'

var THREE = require('three');
var OBJLoader = require('three-obj-loader')(THREE);
var OrbitControls = require('three-orbit-controls')(THREE);

var scene, camera, renderer, controls;
var mouse, raycaster, stats;
var automotonParticles;
var handMesh;
var poolStateMachine;
var lastTime;

//POOL CONSTANT PARAMETERS
//width, height, depth corresponds to the number of rendered particles
const WIDTH = 145;
const HEIGHT = 145;
const DEPTH = 8;
const PARTICLE_SIZE = 2;
//a downscale factor of 3 would result in the automoton pattern being computed at
//3*width x 3*height , but only width*height number of rendered particles.
const DOWNSCALE_FACTOR = 3;


//state machine to control the pool opening for the hand
function PoolStateMachine () {
  this.destination = 0;
  this.state = -1;
  this.curDepth = 0;
  this.count = 0;
  this.update = function() {
    if (this.count > DOWNSCALE_FACTOR*20) return;
    this.count ++;
    for ( var m = 0; m < DEPTH; m ++ ) {
      var dipOffset = Math.round(m*m/5);
    for ( var i = this.iStart-this.count - dipOffset; i < this.iStart+this.count - dipOffset; i ++ ) {
      for ( var j = this.jStart-this.count - dipOffset; j < this.jStart+this.count - dipOffset; j ++ ) {
          automotonParticles.setColorAtPos(i*DOWNSCALE_FACTOR*WIDTH + j + m*DOWNSCALE_FACTOR*HEIGHT*DOWNSCALE_FACTOR*WIDTH,0);
        }
      }
    }
  }
  this.dipAtPos = function(iStart, jStart) {
    this.curDepth = DEPTH-1;
    this.iStart = iStart;
    this.jStart = jStart;
    this.count = 0;
  }
}

function moveHandOnClick (event) {
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  raycaster.setFromCamera( mouse.clone(), camera );
  //find where camera intersects the x-y plane
  var m = -raycaster.ray.origin.y/raycaster.ray.direction.y;
  var jStart = Math.round(m*raycaster.ray.direction.x +raycaster.ray.origin.x);
  var iStart = Math.round(m*raycaster.ray.direction.z +raycaster.ray.origin.z);

  //if clicked outside the pool, ignore
  if (jStart > WIDTH*PARTICLE_SIZE || jStart < 0 || iStart > HEIGHT*PARTICLE_SIZE || iStart < 0){
    return;
  }
  if(handMesh){
    handMesh.position.set(jStart, -40, iStart)
    poolStateMachine.dipAtPos(Math.round(DOWNSCALE_FACTOR*iStart/PARTICLE_SIZE), Math.round(DOWNSCALE_FACTOR*jStart/PARTICLE_SIZE));
  }
}

export default function initWebScene() {
  /** BASIC THREE SETUP **/
  scene = new THREE.Scene();
  //set up camera
  camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 100000 );
  camera.position.set(372, 156,372)
  scene.add( camera );
  //set up controls
  controls = new OrbitControls(camera);
  //restrict movement to stay within the room
  controls.minDistance = 10;
  controls.maxDistance = 750;
  controls.minAzimuthAngle = 0;
  controls.maxAzimuthAngle = Math.PI/3;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = 1.5;
  controls.enablePan = false;

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.antialias = true
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );
  window.addEventListener('click', moveHandOnClick)

  //set up stats
  stats = new Stats();
  stats.showPanel( 0 );
  document.body.appendChild( stats.dom );

  /** LIGHTS **/
  var light = new THREE.PointLight(0xffffff,1,800);
  light.position.set(30,50,30)
  scene.add(light);

  var light2 = new THREE.PointLight(0xffffff,1,800);
  light2.position.set(160,50,160)
  scene.add(light2);

  var light3 = new THREE.PointLight(0xffffff,2,1000);
  light3.position.set(30,700,30)
  scene.add(light3);

  /** SCENE ROOM SETUP **/
  //0.04 and
  var phongShader = THREE.ShaderLib.phong;
  var wallUniforms = ({
    emissiveIntensity : {type: 'f', value: 0.3},
    lightIntensity : {type: 'f', value: 0.04},
  });
  var finalWallUniforms = THREE.UniformsUtils.merge([phongShader.uniforms, wallUniforms]);
  //room walls
  var wallMaterial = new THREE.ShaderMaterial ({
    uniforms : finalWallUniforms,
    vertexShader: vertexShader,
    fragmentShader: genericFragmentShader,
    lights: true,
    side : THREE.DoubleSide,
    derivatives: true,
    defines: {
      GRID: 'grid',
    },
  });

  var wallGeometry = new THREE.BoxBufferGeometry(1000,1000,1000);
  var wallMesh = new THREE.Mesh(wallGeometry, wallMaterial)
  wallMesh.position.set(368,265,368)
  scene.add(wallMesh)

  //floor underneath pool
  var poolFloorMaterial = new THREE.ShaderMaterial ({
    uniforms : phongShader.uniforms,
    vertexShader: vertexShader,
    fragmentShader: poolFloorFragmentShader,
    lights: true,
    side : THREE.DoubleSide,
    derivatives: true,
  });

  var poolFloorGeometry = new THREE.BoxBufferGeometry(800,800,100);
  var poolFloor = new THREE.Mesh(poolFloorGeometry, poolFloorMaterial)
  poolFloor.position.set(120,-55,120)
  poolFloor.rotateX(Math.PI/2)
  scene.add(poolFloor)

  //room floor , consists of 4 box geometries so that there can be a hole for the pool
  //in the middle of the floor
  //note: the floor should be responsive to changing of pool width/height
  var floorUniforms = ({
     offset : {type: 'vec3', value: new THREE.Vector3()},
   });
  var finalFloorUniforms = THREE.UniformsUtils.merge([phongShader.uniforms, floorUniforms]);

  var floorMaterial = new THREE.ShaderMaterial ({
    uniforms : finalFloorUniforms,
    vertexShader: vertexShader,
    fragmentShader: floorFragmentShader,
    lights: true,
    side : THREE.DoubleSide,
    derivatives: true,
  });

  var topGroundGeo = new THREE.BoxBufferGeometry(300,50,PARTICLE_SIZE*WIDTH+1000);
  var topGroundMesh = new THREE.Mesh(topGroundGeo, floorMaterial.clone())
  topGroundMesh.material.uniforms.offset.value = new THREE.Vector3(0-150,0,PARTICLE_SIZE*WIDTH/2)
  topGroundMesh.position.set(0-150,-10,PARTICLE_SIZE*WIDTH/2)
  scene.add(topGroundMesh)

  var bottomGroundMesh = new THREE.Mesh(topGroundGeo, floorMaterial.clone())
  bottomGroundMesh.material.uniforms.offset.value = new THREE.Vector3(PARTICLE_SIZE*HEIGHT+150,-10,PARTICLE_SIZE*WIDTH/2)
  bottomGroundMesh.position.set(PARTICLE_SIZE*HEIGHT+150,-10,PARTICLE_SIZE*WIDTH/2)
  scene.add(bottomGroundMesh)

  var sideGroundGeo = new THREE.BoxBufferGeometry(PARTICLE_SIZE*HEIGHT,50,400);
  var leftGroundMesh = new THREE.Mesh(sideGroundGeo, floorMaterial.clone())
  leftGroundMesh.material.uniforms.offset.value = new THREE.Vector3(PARTICLE_SIZE*HEIGHT/2,-10,PARTICLE_SIZE*WIDTH+400/2)
  leftGroundMesh.position.set(PARTICLE_SIZE*HEIGHT/2,-10,PARTICLE_SIZE*WIDTH+400/2)
  scene.add(leftGroundMesh)

  var rightGroundMesh = new THREE.Mesh(sideGroundGeo, floorMaterial.clone())
  rightGroundMesh.material.uniforms.offset.value = new THREE.Vector3(PARTICLE_SIZE*HEIGHT/2,-10,0-400/2)
  rightGroundMesh.position.set(PARTICLE_SIZE*HEIGHT/2,-10,0-400/2)
  scene.add(rightGroundMesh)

  //hand model
  var loader = new THREE.OBJLoader();
  loader.load(
    require('./assets/hand-smooth-01.obj'),
    function ( object ) {
      scene.add( object );
        var cubeMaterial1 = new THREE.MeshPhysicalMaterial( {
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 0.6,
        } );
        object.children[0].material = cubeMaterial1
        handMesh = object;
        handMesh.scale.multiplyScalar(0.5)
        handMesh.position.set(-1000,1000,1000)
    },
  );

  //vintage phone model
  var texLoader = new THREE.TextureLoader();
  loader.load(
    require('./assets/phone-05.obj'),
    function ( object ) {
      scene.add( object );

      texLoader.load(require('./assets/digits-01.png'), (texture) => {
        var phoneUniforms = ({
           emissiveIntensity : {value: 0.5},
           lightIntensity : {value: 0.5},
           shininess : {value: 0.8},
           emissive : {value: new THREE.Color("#ff29b0")},
         });
        var finalPhoneUniforms = THREE.UniformsUtils.merge([phongShader.uniforms, phoneUniforms]);
        finalPhoneUniforms.shininess.value = 8;
        finalPhoneUniforms.emissive.value = new THREE.Color("#ff29b0");
        var phoneMaterial = new THREE.ShaderMaterial ({
          uniforms : finalPhoneUniforms,
          vertexShader: vertexShader,
          fragmentShader: genericFragmentShader,
          lights: true,
          side : THREE.DoubleSide,
          derivatives: true,
        });

        var finalButtonsUniforms = THREE.UniformsUtils.merge([phongShader.uniforms, phoneUniforms]);
        finalButtonsUniforms.map.value = texture;
        var buttonMaterial = new THREE.ShaderMaterial ({
          uniforms : finalButtonsUniforms,
          vertexShader: vertexShader,
          fragmentShader: genericFragmentShader,
          lights: true,
          side : THREE.DoubleSide,
          derivatives: true,
          defines: {
            USE_MAP: 'use_map'
          },
          transparent: true,
        });
        buttonMaterial.uniforms.map.value.needsUpdate = true;

          object.children.forEach(child => {
            child.material = phoneMaterial
            if(child.name == 'buttons'){
              child.material = buttonMaterial;
            }
          })
          object.scale.multiplyScalar(31)
          object.position.set(90,15.5,-22)
          object.rotateY(Math.PI/4)
      });
    },
  );

  //automoton pool
  automotonParticles = new AutomotonParticles(scene, WIDTH, HEIGHT, DEPTH, PARTICLE_SIZE, DOWNSCALE_FACTOR)

  //helpers
  mouse = new THREE.Vector2();
  raycaster = new THREE.Raycaster();
  poolStateMachine = new PoolStateMachine();
  lastTime = Date.now()

  update()
}

function update() {
    var time = Date.now()
    requestAnimationFrame(update);
    controls.update()
    poolStateMachine.update()
    stats.begin()
    renderer.render(scene, camera);
    stats.end()

    //update automoton particles every 20 ms for a slightly choppier look
    if((time-lastTime) > 20 ){
      lastTime = time;
      automotonParticles.update()

      if(handMesh){
        if(handMesh.position.y <= 30){
          handMesh.position.y += 0.5
        }
        handMesh.rotateY(0.1)
      }
    }
}
