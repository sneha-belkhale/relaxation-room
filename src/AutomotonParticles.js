import PoolInstanceShader from './PoolInstanceShader'
var THREE = require('three');

class AutomotonParticles {
  constructor(scene, width, height, depth, particleSize, downScaleFactor){
    this.layerIdx = 0;
    this.downScaleFactor = downScaleFactor;
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.particleSize = particleSize;
    this.computeWidth = width*downScaleFactor;
    this.computeHeight = height*downScaleFactor;

    //create pool particles with merged vertices for a softer look
    this.poolParticleBoxGeo = new THREE.BoxBufferGeometry(this.particleSize/2, this.particleSize/2, this.particleSize/2);
    const tempGeo = new THREE.Geometry().fromBufferGeometry(this.poolParticleBoxGeo);
    tempGeo.mergeVertices();
    tempGeo.computeVertexNormals();
    tempGeo.computeFaceNormals();
    this.poolParticleBoxGeo = new THREE.BufferGeometry().fromGeometry(tempGeo);

    //set up an instanced geometry for the pool particles
    var instancedPoolGeo = new THREE.InstancedBufferGeometry();
    instancedPoolGeo.index = this.poolParticleBoxGeo.index;
    instancedPoolGeo.attributes.position = this.poolParticleBoxGeo.attributes.position;
    instancedPoolGeo.attributes.uv = this.poolParticleBoxGeo.attributes.uv;
    instancedPoolGeo.attributes.normal = this.poolParticleBoxGeo.attributes.normal;

    var colorIdxArray = new Float32Array(this.width*this.height*this.depth);
    this.colorIdxAttribute = new THREE.InstancedBufferAttribute(colorIdxArray, 1);
    instancedPoolGeo.addAttribute('colorIdx', this.colorIdxAttribute);

    var offsetArray = new Float32Array(this.width*this.height*this.depth * 3);
    this.offsetAttribute = new THREE.InstancedBufferAttribute(offsetArray, 3);
    instancedPoolGeo.addAttribute('offset', this.offsetAttribute);

    //initialize buffer attributes
    for ( i = 0; i < this.height; i ++ ) {
      for ( var j = 0; j < this.width; j ++ ) {
        for ( var m = 0; m < this.depth; m ++ ) {
          num =2*Math.random()
          num = Math.round(num)
          this.offsetAttribute.array[3*(i*this.width + j + m*this.height*this.width)] = j*this.particleSize;
          this.offsetAttribute.array[3*(i*this.width + j+ m*this.height*this.width)+1] = m*this.particleSize*0.55 - this.depth;
          this.offsetAttribute.array[3*(i*this.width + j+ m*this.height*this.width)+2] =i*this.particleSize;
          instancedPoolGeo.attributes.colorIdx.array[(i*this.width + j+ m*this.height*this.width)] = num;
        }
      }
    }

    //add material and add to instanced pool mesh to scene
    var phongShader = THREE.ShaderLib.phong;
    var uniforms = ({
       color1 : {type: 'c', value: new THREE.Color(0xfdc2fd)},
       color2 : {type: 'c', value: new THREE.Color(0xfd5cfd)}
     });
     var poolParticleUniforms = THREE.UniformsUtils.merge([phongShader.uniforms, uniforms]);
    var instancedPoolMat = new THREE.ShaderMaterial({
      uniforms: poolParticleUniforms,
      vertexShader: PoolInstanceShader.vertexShader,
      fragmentShader: PoolInstanceShader.fragmentShader,
      transparent: true,
      lights: true,
    });
    var instancedPools = new THREE.Mesh(instancedPoolGeo, instancedPoolMat);
    scene.add(instancedPools)

    //initialize the compute array that's going to compute the automoton pattern at full scale (not downscaled)
    this.colorIdxComputeArray = new Float32Array(downScaleFactor*downScaleFactor*this.width*this.height*this.depth);
    for ( var i = 0; i < this.downScaleFactor*this.downScaleFactor*this.width*this.height*this.depth; i ++ ) {
      var num =Math.round(2*Math.random())
      this.colorIdxComputeArray[i] = num;
    }

    //helpers
    this.reverse = true;
  }

  update () {

    var nextIdx;
    //find the idx of the next layer to update
    if (this.reverse){
      this.layerIdx -=1;
      if (this.layerIdx <= 0){
        this.reverse = false;
      }
      nextIdx = this.layerIdx + 1
    } else {
      this.layerIdx += 1
      if(this.layerIdx >= this.depth - 1){
        this.reverse = true;
      }
      nextIdx = this.layerIdx -1
    }

    if(this.layerIdx - 1 < 0){
      nextIdx = this.depth-1
    }

    var layer = this.layerIdx*this.computeWidth*this.computeHeight;
    var nextLayer = nextIdx*this.computeWidth*this.computeHeight;

    //compute the full scale automoton pattern for the current layer
    for( var i = 1; i < this.computeHeight - 1; i++){
      for( var j = 1; j < this.computeWidth - 1; j++){
        var idx =this.computeWidth*i + j;
        var curState = this.colorIdxComputeArray[(nextLayer + idx)];
        var nextState = (curState + 1)%3;
        var neighbors = 0;
        for (var k = -1; k <= 1; k++) {
          for (var m = -1; m <= 1; m++) {
            if(this.colorIdxComputeArray[((nextLayer + idx) + m + this.computeWidth*k)] === nextState ){
              neighbors += 1;
            }
          }
        }
        if(neighbors >= 3){
          this.colorIdxComputeArray[layer + idx] = nextState;
        } else {
          this.colorIdxComputeArray[layer + idx] = curState;
        }
      }
    }

    //now go through and set the actual colorIdx attribute
    var layerBaseDownscaled = this.layerIdx*this.width*this.height;
    for( i = 1; i < this.height - 1; i++){
      for( j = 1; j < this.width - 1; j++){
        var idxDownscaled =this.width*i + j;
        idx =this.downScaleFactor*this.computeWidth*i + this.downScaleFactor*j;
        nextState = this.colorIdxComputeArray[layer + idx];
        this.colorIdxAttribute.setX(layerBaseDownscaled + idxDownscaled, nextState)
      }
    }
    this.colorIdxAttribute.needsUpdate = true;
  }

  setColorAtPos(idx, colorIdx){
    this.colorIdxComputeArray[idx] = colorIdx;
  }
}

export default AutomotonParticles;
