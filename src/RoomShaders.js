export const vertexShader = `
	#define PHYSICAL
	varying vec3 vViewPosition;
	#ifndef FLAT_SHADED
		varying vec3 vNormal;
	#endif
	#include <common>
	#include <uv_pars_vertex>
	#include <uv2_pars_vertex>
	#include <displacementmap_pars_vertex>
	#include <color_pars_vertex>
	#include <fog_pars_vertex>
	#include <morphtarget_pars_vertex>
	#include <skinning_pars_vertex>
	#include <shadowmap_pars_vertex>
	#include <logdepthbuf_pars_vertex>
	#include <clipping_planes_pars_vertex>
	#ifdef USE_INSTANCE_SCALE
	    attribute vec3 instanceScale;
	#endif
	#ifdef USE_INSTANCE_ORIENTATION
	    attribute vec4 instanceOrientation;
	#endif
	#ifdef USE_INSTANCE_OFFSET
	    attribute vec3 instanceOffset;
	#endif
	#ifdef USE_INSTANCE_GREYSCALE
	    attribute float instanceGreyScale;
	    varying float vGreyScale;
	#endif

	#ifndef USE_MAP
	varying vec2 vUv;
	#endif
	varying vec3 vPos;
	void main() {
	  vUv= uv;
	  vPos = position;
		#include <uv_vertex>
		#include <uv2_vertex>
		#include <color_vertex>
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
	  #include <skinnormal_vertex>
	#ifdef USE_INSTANCE_ORIENTATION
		objectNormal = quaternionTransform(instanceOrientation, objectNormal);
	#endif
		#include <defaultnormal_vertex>
	#ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED
		vNormal = normalize( transformedNormal );
	#endif
		#include <begin_vertex>

	  #include <morphtarget_vertex>

	#ifdef USE_INSTANCE_SCALE
		transformed *= instanceScale;
	#endif
	#ifdef USE_INSTANCE_ORIENTATION
		transformed = quaternionTransform(instanceOrientation, transformed);
	#endif
	#ifdef USE_INSTANCE_OFFSET
		transformed += instanceOffset;
	#endif

		#include <skinning_vertex>
		#include <displacementmap_vertex>
		#include <project_vertex>
		#include <logdepthbuf_vertex>
		#include <clipping_planes_vertex>
		vViewPosition = - mvPosition.xyz;
		#include <worldpos_vertex>
		#include <shadowmap_vertex>
	  #include <fog_vertex>

	#ifdef USE_INSTANCE_GREYSCALE
	  vGreyScale = instanceGreyScale;
	#endif
	}
`;
export const floorFragmentShader = `

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
	varying vec2 vUv;
	varying vec3 vPos;
	uniform vec3 offset;

	float grid(vec2 st, float res)
	{
	  vec2 grid = fract(st*res);
	  return (step(res,grid.x) * step(res,grid.y));
	}

	void main() {
		#include <clipping_planes_fragment>
		vec4 diffuseColor = vec4( diffuse, opacity );
		ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );

	  // Compute anti-aliased world-space grid lines
	  vec3 totalEmissiveRadiance = emissive;
	  // Pick a coordinate to visualize in a grid
	  vec2 coord = 0.03*vec2(vPos.z + offset.z, vPos.x + offset.x);

	  // Compute anti-aliased world-space grid lines
	  vec2 grid = abs(fract(coord - 0.5) - 0.5) / (1.3*fwidth(coord));
	  float line = clamp(1.0 - min(grid.y, grid.x),0.0,1.0);

	  // Just visualize the grid lines directly
	  totalEmissiveRadiance = (1.0 - min(line,1.0))*vec3(vUv.x,0.1,vUv.y);
		totalEmissiveRadiance = vec3(line, line, line);

		totalEmissiveRadiance += 1.3*(1.0-line)*vec3(0.4,0.6,0.7);

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

		reflectedLight.directDiffuse *=0.04;
		// modulation
		#include <aomap_fragment>
		vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
		#include <envmap_fragment>
		gl_FragColor = vec4( outgoingLight, diffuseColor.a );
		#include <tonemapping_fragment>
		#include <encodings_fragment>
		#include <fog_fragment>
		#include <premultiplied_alpha_fragment>
		#include <dithering_fragment>
	}`
;

export const genericFragmentShader = `

	#define PHONG
	uniform vec3 diffuse;
	uniform vec3 emissive;
	uniform vec3 specular;
	uniform float shininess;
	uniform float opacity;
	uniform float lightIntensity;
	uniform float emissiveIntensity;

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
	#ifndef USE_MAP
	varying vec2 vUv;
	#endif
	varying vec3 vPos;
	#ifdef GRID
		float grid(vec2 st, float res) {
			vec2 grid = fract(st*res);
			return (step(res,grid.x) * step(res,grid.y));
		}
	#endif


	void main() {
		#include <clipping_planes_fragment>
		vec4 diffuseColor = vec4( diffuse, opacity );
		ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
		vec3 totalEmissiveRadiance = emissiveIntensity*emissive;

		#ifdef GRID
		  // Compute anti-aliased world-space grid lines
		  // Pick a coordinate to visualize in a grid
		  vec2 coord = 20.0*vec2(vUv.x, vUv.y);

		  // Compute anti-aliased world-space grid lines
		  vec2 grid = abs(fract(coord - 0.5) - 0.5) / (2.0*fwidth(coord));
		  float line = clamp(1.0 - min(grid.y, grid.x),0.0,1.0);

		  // Just visualize the grid lines directly
		  totalEmissiveRadiance = (1.0 - min(line,1.0))*vec3(vUv.x,0.1,vUv.y);
			totalEmissiveRadiance = vec3(line, line, line);

			totalEmissiveRadiance += 1.3*(1.0-line)*vec3(vUv.y,0.5,0.6);
		#endif

		#include <logdepthbuf_fragment>
		// #include <map_fragment>
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

		reflectedLight.directDiffuse *= lightIntensity;
		// modulation
		#include <aomap_fragment>
		vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
		#include <envmap_fragment>
		gl_FragColor = vec4( outgoingLight, diffuseColor.a );

		#ifdef USE_MAP
		vec4 digitsColor = texture2D(map, vUv);
		if (digitsColor.a > 0.2) {
			gl_FragColor *= digitsColor.a*3.0;
		}
		#endif

		#include <tonemapping_fragment>
		#include <encodings_fragment>
		#include <fog_fragment>
		#include <premultiplied_alpha_fragment>
		#include <dithering_fragment>
	}
`;

export const poolFloorFragmentShader = `

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
varying vec2 vUv;
varying vec3 vPos;

float grid(vec2 st, float res)
{
  vec2 grid = fract(st*res);
  return (step(res,grid.x) * step(res,grid.y));
}

void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );

  // Compute anti-aliased world-space grid lines
  vec3 totalEmissiveRadiance = emissive;
	totalEmissiveRadiance.xyz = 0.8*vec3(1.5*vUv.x, 1.3*vUv.y, 1.0);

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

	reflectedLight.directDiffuse *=0.07;
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	// modulation
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}
`
