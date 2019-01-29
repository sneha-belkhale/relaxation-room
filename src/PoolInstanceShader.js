const PoolInstanceShader = {

  vertexShader: `
    varying vec3 vViewPosition;

    #ifndef FLAT_SHADED
    	varying vec3 vNormal;
    #endif

    #include <common>
    #include <uv_pars_vertex>
    #include <uv2_pars_vertex>
    #include <displacementmap_pars_vertex>
    #include <envmap_pars_vertex>
    #include <color_pars_vertex>
    #include <fog_pars_vertex>
    #include <morphtarget_pars_vertex>
    #include <skinning_pars_vertex>
    #include <shadowmap_pars_vertex>
    #include <logdepthbuf_pars_vertex>
    #include <clipping_planes_pars_vertex>

    attribute vec3 offset;
    attribute vec3 color;
    attribute float colorIdx;

    varying float vColorIdx;

    varying vec3 vColor;
    float rand(float n){return fract(sin(n) * 43758.5453123);}

    void main() {
      vColor = color;
      vColorIdx = colorIdx;

    	#include <uv_vertex>
    	#include <uv2_vertex>
    	#include <color_vertex>

    	#include <beginnormal_vertex>
    	#include <morphnormal_vertex>
    	#include <skinbase_vertex>
    	#include <skinnormal_vertex>
    	#include <defaultnormal_vertex>

    #ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED
    	vNormal = normalize( transformedNormal );
    #endif

      vec3 rand = 0.5*rand(offset.x*offset.z)*vec3(1.0, 1.0, 1.0);
    	vec3 transformed = vec3( position + offset + rand);
    	#include <morphtarget_vertex>
    	#include <skinning_vertex>
    	#include <displacementmap_vertex>
    	#include <project_vertex>
    	#include <logdepthbuf_vertex>
    	#include <clipping_planes_vertex>

    	vViewPosition = - mvPosition.xyz;

    	#include <worldpos_vertex>
    	#include <envmap_vertex>
    	#include <shadowmap_vertex>
    	#include <fog_vertex>

    }
  `,

  fragmentShader: `
    #define PHONG

    uniform vec3 diffuse;
    uniform vec3 emissive;
    uniform vec3 specular;
    uniform float shininess;
    uniform float opacity;

    #include <common>
    #include <packing>
    #include <dithering_pars_fragment>
    #include <color_pars_fragment>
    #include <uv_pars_fragment>
    #include <uv2_pars_fragment>
    #include <map_pars_fragment>
    #include <alphamap_pars_fragment>
    #include <aomap_pars_fragment>
    #include <lightmap_pars_fragment>
    #include <emissivemap_pars_fragment>
    #include <envmap_pars_fragment>
    #include <gradientmap_pars_fragment>
    #include <fog_pars_fragment>
    #include <bsdfs>
    #include <lights_pars_begin>
    #include <lights_phong_pars_fragment>
    #include <shadowmap_pars_fragment>
    #include <bumpmap_pars_fragment>
    #include <normalmap_pars_fragment>
    #include <specularmap_pars_fragment>
    #include <logdepthbuf_pars_fragment>
    #include <clipping_planes_pars_fragment>
    float rand(float n){return fract(sin(n) * 43758.5453123);}

    varying float vColorIdx;
    uniform vec3 color1;
    uniform vec3 color2;

    void main() {

    	#include <clipping_planes_fragment>
      vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, 1.0 );

      //parse the cellular automaton color. color0 is opacity 0.
      if(vColorIdx < 0.5){
        diffuseColor.a = 0.0;
      }
      if(vColorIdx == 1.0){
        diffuseColor.xyz = color1;
      }
      if(vColorIdx == 2.0){
        diffuseColor.xyz = color2;
      }
      //small change in color with camera position
      diffuseColor.x += 0.0017*vViewPosition.x;
      diffuseColor.zy += 0.0017*vViewPosition.z;

    	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
    	vec3 totalEmissiveRadiance = emissive;

    	#include <logdepthbuf_fragment>
    	#include <map_fragment>
    	#include <color_fragment>
    	#include <alphamap_fragment>
    	#include <alphatest_fragment>
    	#include <specularmap_fragment>
    	#include <normal_fragment_begin>
    	#include <normal_fragment_maps>
    	#include <emissivemap_fragment>

    	// accumulation
    	#include <lights_phong_fragment>
    	#include <lights_fragment_begin>
    	#include <lights_fragment_maps>
    	#include <lights_fragment_end>

    	// modulation
    	#include <aomap_fragment>
    	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
    	#include <envmap_fragment>
    	gl_FragColor = vec4( 0.4*outgoingLight + 0.35*diffuseColor.rgb, diffuseColor.a );

    }
  `,

};

export default PoolInstanceShader;
