import Check from "../Core/Check.js";
import Frozen from "../Core/Frozen.js";

/**
 * @typedef {object} ExternalRenderer.ConstructorOptions
 *
 * Initialization options for the ExternalRenderer constructor
 *
 * @property {ExternalRenderer.RenderCallback} render The function that draws into the scene's frame.
 * @property {BoundingSphere|OrientedBoundingBox} [boundingVolume] The world-space volume, in the scene's world coordinates, that contains everything the renderer draws. It is used to cull the renderer when it is out of view, to fit the near and far planes of the scene's frustums around it, and to call the renderer only in the frustums it overlaps. Without one the renderer is never culled, and is treated as spanning the camera's whole near-to-far range, as a {@link DrawCommand} without a bounding volume is. It is in the globe's fixed frame, so in 2D and Columbus view the renderer is treated as unbounded.
 * @property {boolean} [show=true] Determines if the renderer is called.
 */

/**
 * The function an {@link ExternalRenderer} calls to draw into the scene's frame.
 *
 * @callback ExternalRenderer.RenderCallback
 * @param {ExternalRenderer.RenderParameters} parameters The context, target, camera and depth encoding for this frustum. The object, and the objects it holds, are only valid during the call, and are reused afterwards.
 */

/**
 * The parameters passed to an {@link ExternalRenderer.RenderCallback}: what an
 * external renderer needs to draw into the frame Cesium is rendering, from the
 * same camera, and composite with it by depth.
 *
 * @typedef {object} ExternalRenderer.RenderParameters
 *
 * @property {WebGLRenderingContext|WebGL2RenderingContext} gl The WebGL context the scene draws with.
 * @property {boolean} webgl2 <code>true</code> if <code>gl</code> is a WebGL 2 context.
 * @property {WebGLFramebuffer|null} framebuffer The framebuffer the scene's opaque geometry was drawn into for this pass, or <code>null</code> for the default framebuffer. It is bound to <code>gl.FRAMEBUFFER</code> when the callback is called, and its depth attachment holds the depth of the opaque geometry drawn so far in this frustum.
 * @property {BoundingRectangle} viewport The viewport of the pass, in pixels. It is set with <code>gl.viewport</code> when the callback is called.
 * @property {Matrix4} viewMatrix The view matrix, from the scene's world coordinates to eye coordinates, in double precision. A renderer whose geometry lives in a local frame should multiply it by its own model matrix in double precision, and give the product to the GPU, rather than upload world coordinates in single precision.
 * @property {Matrix4} projectionMatrix The projection matrix of this frustum, from eye coordinates to clip coordinates.
 * @property {number} near The distance to this frustum's near plane, in meters.
 * @property {number} far The distance to this frustum's far plane, in meters.
 * @property {number} frustumIndex The index of this frustum, <code>0</code> being the nearest. Frustums are drawn from the farthest to the nearest, and the depth buffer is cleared before each.
 * @property {number} frustumCount The number of frustums the scene is drawn in this frame.
 * @property {boolean} logarithmicDepth <code>true</code> if the scene writes a logarithmic depth buffer this frame. To composite by depth, the renderer then has to write the same depth Cesium's shaders do: for a fragment at distance <code>w</code> in front of the camera along its view direction (the clip coordinate <code>w</code> of a perspective projection, <code>-z</code> in eye coordinates), <code>gl_FragDepth = log2(w - near + 1.0) * oneOverLog2FarDepthFromNearPlusOne</code>, discarding the fragment when <code>w - near + 1.0</code> is outside <code>(1.0, farDepthFromNearPlusOne]</code>. Otherwise depth is the window-space depth of <code>projectionMatrix</code> with the default depth range.
 * @property {number} farDepthFromNearPlusOne <code>far - near + 1.0</code>, as <code>czm_farDepthFromNearPlusOne</code>.
 * @property {number} log2FarDepthFromNearPlusOne <code>log2(farDepthFromNearPlusOne)</code>, as <code>czm_log2FarDepthFromNearPlusOne</code>.
 * @property {number} oneOverLog2FarDepthFromNearPlusOne <code>1.0 / log2FarDepthFromNearPlusOne</code>, as <code>czm_oneOverLog2FarDepthFromNearPlusOne</code>.
 * @property {Cartesian3} cameraPositionWC The camera's position in world coordinates, in double precision.
 * @property {Cartesian3} sunDirectionWC The direction of the sun in world coordinates, as <code>czm_sunDirectionWC</code>.
 * @property {Cartesian3} lightDirectionWC The direction of the scene's light in world coordinates, toward the light, as <code>czm_lightDirectionWC</code>.
 * @property {Cartesian3} lightColor The color of the scene's light, clamped to [0, 1], as <code>czm_lightColor</code>.
 * @property {Cartesian3} lightColorHdr The color of the scene's light times its intensity, as <code>czm_lightColorHdr</code>.
 * @property {boolean} highDynamicRange <code>true</code> if the scene renders in high dynamic range this frame; the target then holds linear colour, tone mapped later.
 * @property {number} pixelRatio The ratio of drawing-buffer pixels to CSS pixels.
 * @property {SceneMode} mode The scene's mode. In 2D and Columbus view the view matrix is that of the projected scene, not of the globe's fixed frame.
 * @property {number} frameNumber The current frame number.
 * @property {JulianDate} time The scene's time.
 */

/**
 * A renderer outside Cesium that draws into the scene's frame with the scene's
 * WebGL context, depth-composited with what Cesium draws: a three.js scene
 * standing on the globe, say, or a renderer that replays another engine's
 * WebGL calls.
 * <p>
 * Add it to {@link Scene#externalRenderers}. In each render pass, the scene
 * calls its <code>render</code> function once for each of the frame's frustums
 * that its bounding volume overlaps, after the frustum's opaque geometry (the
 * globe, 3D Tiles, classification, voxels, opaque primitives, Gaussian splats)
 * and before its translucent geometry, with that frustum's projection and
 * near and far planes. With a logarithmic depth buffer the frame is usually a
 * single frustum.
 * </p>
 * <p>
 * The callback draws with the WebGL context it is given, into the framebuffer
 * that is bound, testing and writing depth. It should not clear the
 * framebuffer, and should leave its stencil unchanged: Cesium keeps per-pixel
 * state there for classification. It may change any other WebGL state: Cesium
 * resets its own state cache after the call, so it does not rely on what it
 * last set.
 * </p>
 * <p>
 * The callback is not called in pick passes, so the renderer's geometry is not
 * picked, and it casts no shadows.
 * </p>
 *
 * @alias ExternalRenderer
 * @constructor
 *
 * @param {ExternalRenderer.ConstructorOptions} options Object describing initialization options
 *
 * @see Scene#externalRenderers
 *
 * @example
 * // Draw a scene of another engine in a local east-north-up frame.
 * const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
 *   Cesium.Cartesian3.fromDegrees(-73.98, 40.75),
 * );
 * const modelView = new Cesium.Matrix4();
 * viewer.scene.externalRenderers.add(
 *   new Cesium.ExternalRenderer({
 *     boundingVolume: new Cesium.BoundingSphere(
 *       Cesium.Matrix4.getTranslation(modelMatrix, new Cesium.Cartesian3()),
 *       10000.0,
 *     ),
 *     render: function (parameters) {
 *       // Compose in double precision; upload the small product.
 *       Cesium.Matrix4.multiply(parameters.viewMatrix, modelMatrix, modelView);
 *       myEngine.draw(parameters.gl, {
 *         framebuffer: parameters.framebuffer,
 *         viewport: parameters.viewport,
 *         modelView: Cesium.Matrix4.toArray(modelView),
 *         projection: Cesium.Matrix4.toArray(parameters.projectionMatrix),
 *       });
 *     },
 *   }),
 * );
 */
function ExternalRenderer(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("options.render", options.render);
  //>>includeEnd('debug');

  /**
   * The function that draws into the scene's frame.
   *
   * @type {ExternalRenderer.RenderCallback}
   */
  this.render = options.render;

  /**
   * The world-space volume that contains everything the renderer draws, or
   * <code>undefined</code> if it is unbounded.
   *
   * @type {BoundingSphere|OrientedBoundingBox|undefined}
   * @default undefined
   */
  this.boundingVolume = options.boundingVolume;

  /**
   * Determines if the renderer is called.
   *
   * @type {boolean}
   * @default true
   */
  this.show = options.show ?? true;
}

export default ExternalRenderer;
