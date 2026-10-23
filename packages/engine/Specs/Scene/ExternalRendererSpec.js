import {
  BlendingState,
  BoundingSphere,
  BoxGeometry,
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  defined,
  DrawCommand,
  ExternalRenderer,
  GeometryInstance,
  JulianDate,
  Math as CesiumMath,
  Pass,
  PerInstanceColorAppearance,
  PerspectiveFrustum,
  Primitive,
  RenderState,
  ShaderProgram,
  ShaderSource,
  Transforms,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";
import createWebglVersionHelper from "../createWebglVersionHelper.js";

describe(
  "Scene/ExternalRenderer",
  function () {
    const webglStub = !!window.webglStub;

    it("constructs with defaults", function () {
      const render = function () {};
      const renderer = new ExternalRenderer({ render: render });
      expect(renderer.render).toBe(render);
      expect(renderer.show).toBe(true);
      expect(renderer.boundingVolume).toBeUndefined();
    });

    it("constructs with options", function () {
      const boundingVolume = new BoundingSphere(Cartesian3.ZERO, 1.0);
      const renderer = new ExternalRenderer({
        render: function () {},
        show: false,
        boundingVolume: boundingVolume,
      });
      expect(renderer.show).toBe(false);
      expect(renderer.boundingVolume).toBe(boundingVolume);
    });

    it("throws without a render function", function () {
      expect(function () {
        return new ExternalRenderer();
      }).toThrowDeveloperError();
      expect(function () {
        return new ExternalRenderer({ render: 1 });
      }).toThrowDeveloperError();
    });

    createWebglVersionHelper(createSpecs);

    function createSpecs(contextOptions) {
      let scene;
      let camera;

      // The camera at +X, looking at the origin along -X.
      function lookAlongNegativeX() {
        camera.frustum = new PerspectiveFrustum();
        camera.frustum.fov = CesiumMath.toRadians(60.0);
        camera.frustum.aspectRatio = 1.0;
        camera.frustum.near = 1.0;
        camera.frustum.far = 5.0e8;
        camera.position = new Cartesian3(1.0e7, 0.0, 0.0);
        camera.direction = Cartesian3.negate(
          Cartesian3.UNIT_X,
          new Cartesian3(),
        );
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.cross(
          camera.direction,
          camera.up,
          new Cartesian3(),
        );
      }

      // A point the given distance in front of the camera.
      function ahead(distance) {
        return new Cartesian3(1.0e7 - distance, 0.0, 0.0);
      }

      function createScenes(options) {
        beforeAll(function () {
          scene = createScene({
            contextOptions: contextOptions,
            orderIndependentTranslucency: options?.oit ?? true,
          });
          camera = scene.camera;
        });

        afterAll(function () {
          scene.destroyForSpecs();
        });

        beforeEach(function () {
          lookAlongNegativeX();
          scene.logarithmicDepthBuffer = false;
        });

        afterEach(function () {
          scene.externalRenderers.removeAll();
          scene.primitives.removeAll();
        });
      }

      // Records the parameters of each call; the object passed is reused.
      function recordCalls() {
        const calls = [];
        const render = function (parameters) {
          calls.push({
            gl: parameters.gl,
            framebuffer: parameters.framebuffer,
            boundFramebuffer: parameters.gl.getParameter(
              parameters.gl.FRAMEBUFFER_BINDING,
            ),
            viewport: parameters.viewport.clone(),
            viewMatrix: parameters.viewMatrix.clone(),
            projectionMatrix: parameters.projectionMatrix.clone(),
            near: parameters.near,
            far: parameters.far,
            frustumIndex: parameters.frustumIndex,
            frustumCount: parameters.frustumCount,
            logarithmicDepth: parameters.logarithmicDepth,
            farDepthFromNearPlusOne: parameters.farDepthFromNearPlusOne,
            log2FarDepthFromNearPlusOne: parameters.log2FarDepthFromNearPlusOne,
            oneOverLog2FarDepthFromNearPlusOne:
              parameters.oneOverLog2FarDepthFromNearPlusOne,
            cameraPositionWC: Cartesian3.clone(parameters.cameraPositionWC),
            sunDirectionWC: Cartesian3.clone(parameters.sunDirectionWC),
            frameNumber: parameters.frameNumber,
            time: JulianDate.clone(parameters.time),
          });
        };
        return { calls: calls, render: render };
      }

      describe("calls", function () {
        createScenes();

        it("calls a renderer with the scene's context, framebuffer and camera", function () {
          const recorder = recordCalls();
          scene.externalRenderers.add(
            new ExternalRenderer({
              render: recorder.render,
              boundingVolume: new BoundingSphere(ahead(100.0), 10.0),
            }),
          );

          scene.renderForSpecs();

          expect(recorder.calls.length).toEqual(1);
          const call = recorder.calls[0];
          expect(call.gl).toBe(scene.context._gl);
          if (!webglStub) {
            expect(call.boundFramebuffer).toBe(call.framebuffer);
          }
          expect(call.viewport.width).toEqual(scene.context.drawingBufferWidth);
          expect(call.viewport.height).toEqual(
            scene.context.drawingBufferHeight,
          );
          expect(call.viewMatrix).toEqual(camera.viewMatrix);
          expect(call.cameraPositionWC).toEqualEpsilon(
            camera.positionWC,
            CesiumMath.EPSILON9,
          );
          expect(call.sunDirectionWC).toEqual(
            scene.context.uniformState.sunDirectionWC,
          );
          expect(call.frameNumber).toEqual(scene.frameState.frameNumber);
          expect(call.time).toEqual(scene.frameState.time);
          expect(call.frustumIndex).toEqual(0);
          expect(call.frustumCount).toEqual(1);
          expect(call.logarithmicDepth).toBe(false);

          // The frustum's projection, fit to the bounding volume.
          expect(call.near).toEqualEpsilon(90.0, CesiumMath.EPSILON6);
          expect(call.far).toBeGreaterThan(110.0);
          const frustum = camera.frustum.clone();
          frustum.near = call.near;
          frustum.far = call.far;
          expect(call.projectionMatrix).toEqualEpsilon(
            frustum.projectionMatrix,
            CesiumMath.EPSILON12,
          );
        });

        it("calls a renderer once per frustum, far to near, with each frustum's projection", function () {
          // Without a bounding volume the renderer spans the camera's whole
          // range, which takes several frustums without a logarithmic depth
          // buffer.
          const recorder = recordCalls();
          scene.externalRenderers.add(
            new ExternalRenderer({ render: recorder.render }),
          );

          scene.renderForSpecs();

          const frustumCommandsList = scene.frustumCommandsList;
          const frustumCount = frustumCommandsList.length;
          expect(frustumCount).toBeGreaterThan(1);
          expect(recorder.calls.length).toEqual(frustumCount);

          for (let i = 0; i < frustumCount; ++i) {
            const call = recorder.calls[i];
            const index = frustumCount - i - 1;
            const frustumCommands = frustumCommandsList[index];
            expect(call.frustumIndex).toEqual(index);
            expect(call.frustumCount).toEqual(frustumCount);
            // The near plane of the opaque passes, which overlap the next
            // frustum slightly.
            const near =
              index !== 0
                ? frustumCommands.near * scene.opaqueFrustumNearOffset
                : frustumCommands.near;
            expect(call.near).toEqualEpsilon(near, CesiumMath.EPSILON12);
            expect(call.far).toEqualEpsilon(
              frustumCommands.far,
              CesiumMath.EPSILON12,
            );
            const frustum = camera.frustum.clone();
            frustum.near = near;
            frustum.far = frustumCommands.far;
            expect(call.projectionMatrix).toEqualEpsilon(
              frustum.projectionMatrix,
              CesiumMath.EPSILON12,
            );
            expect(call.viewMatrix).toEqual(camera.viewMatrix);
          }
        });

        it("calls a bounded renderer only in the frustums it overlaps", function () {
          scene.externalRenderers.add(
            new ExternalRenderer({ render: function () {} }),
          );
          const recorder = recordCalls();
          scene.externalRenderers.add(
            new ExternalRenderer({
              render: recorder.render,
              boundingVolume: new BoundingSphere(ahead(100.0), 10.0),
            }),
          );

          scene.renderForSpecs();

          expect(scene.frustumCommandsList.length).toBeGreaterThan(1);
          expect(recorder.calls.length).toEqual(1);
          expect(recorder.calls[0].frustumIndex).toEqual(0);
        });

        it("fits the frustums to a renderer's bounding volume", function () {
          scene.externalRenderers.add(
            new ExternalRenderer({
              render: function () {},
              boundingVolume: new BoundingSphere(ahead(1.0e6), 1.0e4),
            }),
          );

          scene.renderForSpecs();

          const frustumCommandsList = scene.frustumCommandsList;
          expect(frustumCommandsList[0].near).toEqualEpsilon(
            1.0e6 - 1.0e4,
            CesiumMath.EPSILON6,
          );
          expect(
            frustumCommandsList[frustumCommandsList.length - 1].far,
          ).toBeGreaterThanOrEqual(1.0e6 + 1.0e4);
        });

        it("passes the logarithmic depth constants", function () {
          if (!scene.context.fragmentDepth) {
            return;
          }
          scene.logarithmicDepthBuffer = true;
          const recorder = recordCalls();
          scene.externalRenderers.add(
            new ExternalRenderer({
              render: recorder.render,
              boundingVolume: new BoundingSphere(ahead(100.0), 10.0),
            }),
          );

          scene.renderForSpecs();

          expect(recorder.calls.length).toEqual(1);
          const call = recorder.calls[0];
          expect(call.logarithmicDepth).toBe(true);
          const farDepthFromNearPlusOne = call.far - call.near + 1.0;
          expect(call.farDepthFromNearPlusOne).toEqualEpsilon(
            farDepthFromNearPlusOne,
            CesiumMath.EPSILON12,
          );
          expect(call.log2FarDepthFromNearPlusOne).toEqualEpsilon(
            Math.log2(farDepthFromNearPlusOne),
            CesiumMath.EPSILON12,
          );
          expect(call.oneOverLog2FarDepthFromNearPlusOne).toEqualEpsilon(
            1.0 / Math.log2(farDepthFromNearPlusOne),
            CesiumMath.EPSILON12,
          );
        });

        it("does not call a renderer whose bounding volume is out of view", function () {
          const render = jasmine.createSpy("render");
          scene.externalRenderers.add(
            new ExternalRenderer({
              render: render,
              boundingVolume: new BoundingSphere(ahead(-100.0), 10.0),
            }),
          );

          scene.renderForSpecs();

          expect(render).not.toHaveBeenCalled();
        });

        it("does not call a renderer that is not shown", function () {
          const render = jasmine.createSpy("render");
          const renderer = scene.externalRenderers.add(
            new ExternalRenderer({ render: render, show: false }),
          );

          scene.renderForSpecs();
          expect(render).not.toHaveBeenCalled();

          renderer.show = true;
          scene.renderForSpecs();
          expect(render).toHaveBeenCalled();
        });

        it("does not call a removed renderer", function () {
          const render = jasmine.createSpy("render");
          const renderer = scene.externalRenderers.add(
            new ExternalRenderer({
              render: render,
              boundingVolume: new BoundingSphere(ahead(100.0), 10.0),
            }),
          );

          scene.renderForSpecs();
          expect(render.calls.count()).toEqual(1);

          expect(scene.externalRenderers.remove(renderer)).toBe(true);
          scene.renderForSpecs();
          expect(render.calls.count()).toEqual(1);
        });

        it("does not call a renderer in a pick pass", function () {
          const render = jasmine.createSpy("render");
          scene.externalRenderers.add(
            new ExternalRenderer({
              render: render,
              boundingVolume: new BoundingSphere(ahead(100.0), 10.0),
            }),
          );

          scene.pickForSpecs();
          expect(render).not.toHaveBeenCalled();
        });

        it("resets the context's state after each renderer", function () {
          spyOn(scene.context, "resetState").and.callThrough();
          scene.externalRenderers.add(
            new ExternalRenderer({ render: function () {} }),
          );
          scene.externalRenderers.add(
            new ExternalRenderer({ render: function () {} }),
          );

          scene.renderForSpecs();

          expect(scene.context.resetState.calls.count()).toEqual(
            2 * scene.frustumCommandsList.length,
          );
        });

        it("resets the context's state when a renderer throws", function () {
          spyOn(scene.context, "resetState").and.callThrough();
          scene.externalRenderers.add(
            new ExternalRenderer({
              render: function () {
                throw new Error("external");
              },
              boundingVolume: new BoundingSphere(ahead(100.0), 10.0),
            }),
          );

          expect(function () {
            scene.renderForSpecs();
          }).toThrowError(/external/);
          expect(scene.context.resetState).toHaveBeenCalled();
        });
      });

      describe("pass order", function () {
        createScenes({ oit: false });

        function createOrderCommand(pass, name, order) {
          const command = new DrawCommand({
            shaderProgram: ShaderProgram.fromCache({
              context: scene.context,
              vertexShaderSource: new ShaderSource({
                sources: ["void main() { gl_Position = vec4(1.0); }"],
              }),
              fragmentShaderSource: new ShaderSource({
                sources: ["void main() { out_FragColor = vec4(1.0); }"],
              }),
            }),
            renderState: RenderState.fromCache(),
            boundingVolume: new BoundingSphere(ahead(100.0), 10.0),
            pass: pass,
          });
          command.execute = function () {
            order.push(name);
          };
          return {
            update: function (frameState) {
              frameState.commandList.push(command);
            },
            isDestroyed: function () {
              return false;
            },
            destroy: function () {},
          };
        }

        it("calls renderers after the opaque passes and before the translucent pass", function () {
          const order = [];
          scene.primitives.add(
            createOrderCommand(Pass.TRANSLUCENT, "translucent", order),
          );
          scene.primitives.add(
            createOrderCommand(Pass.OPAQUE, "opaque", order),
          );
          scene.primitives.add(
            createOrderCommand(Pass.CESIUM_3D_TILE, "3d tiles", order),
          );
          scene.primitives.add(createOrderCommand(Pass.GLOBE, "globe", order));
          scene.externalRenderers.add(
            new ExternalRenderer({
              render: function () {
                order.push("external");
              },
              boundingVolume: new BoundingSphere(ahead(100.0), 10.0),
            }),
          );

          scene.renderForSpecs();

          expect(order).toEqual([
            "globe",
            "3d tiles",
            "opaque",
            "external",
            "translucent",
          ]);
        });
      });

      // A full-viewport quad drawn with raw WebGL at a given depth, as an
      // external renderer would.
      function createRawQuad(gl) {
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(
          vs,
          "attribute vec2 a_position;\n" +
            "uniform float u_z;\n" +
            "void main() { gl_Position = vec4(a_position, u_z, 1.0); }\n",
        );
        gl.compileShader(vs);
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(
          fs,
          "precision mediump float;\n" +
            "uniform vec4 u_color;\n" +
            "void main() { gl_FragColor = u_color; }\n",
        );
        gl.compileShader(fs);
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.bindAttribLocation(program, 0, "a_position");
        gl.linkProgram(program);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]),
          gl.STATIC_DRAW,
        );
        return {
          program: program,
          buffer: buffer,
          z: gl.getUniformLocation(program, "u_z"),
          color: gl.getUniformLocation(program, "u_color"),
        };
      }

      function drawRawQuad(gl, quad, z, color) {
        gl.useProgram(quad.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad.buffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1f(quad.z, z);
        gl.uniform4f(quad.color, color.red, color.green, color.blue, 1.0);
        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        gl.colorMask(true, true, true, true);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Changes every piece of WebGL state Cesium caches, as an external
      // renderer may.
      function scrambleState(gl, quad) {
        gl.useProgram(quad.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer());
        gl.activeTexture(gl.TEXTURE5);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ZERO, gl.ZERO);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT_AND_BACK);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.NEVER);
        gl.depthMask(false);
        gl.enable(gl.STENCIL_TEST);
        gl.stencilFunc(gl.NEVER, 1, 0xff);
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(0, 0, 0, 0);
        gl.colorMask(false, false, false, false);
        gl.viewport(0, 0, 0, 0);
        gl.clearColor(1.0, 0.0, 1.0, 1.0);
        gl.clearDepth(0.0);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        if (scene.context.webgl2) {
          gl.bindSampler(0, gl.createSampler());
          gl.enable(gl.RASTERIZER_DISCARD);
        }
      }

      function createQuadCommand(pass, z, color) {
        const translucent = pass === Pass.TRANSLUCENT;
        const command = new DrawCommand({
          vertexArray: scene.context.getViewportQuadVertexArray(),
          shaderProgram: ShaderProgram.fromCache({
            context: scene.context,
            vertexShaderSource:
              "in vec4 position;\n" +
              "uniform float u_z;\n" +
              "void main() { gl_Position = vec4(position.xy, u_z, 1.0); }\n",
            fragmentShaderSource:
              "uniform vec4 u_color;\n" +
              "void main() { out_FragColor = u_color; }\n",
            attributeLocations: { position: 0, textureCoordinates: 1 },
          }),
          uniformMap: {
            u_z: function () {
              return z;
            },
            u_color: function () {
              return color;
            },
          },
          renderState: RenderState.fromCache({
            depthTest: { enabled: true },
            depthMask: !translucent,
            blending: translucent ? BlendingState.ALPHA_BLEND : undefined,
          }),
          boundingVolume: new BoundingSphere(ahead(100.0), 10.0),
          pass: pass,
        });
        return {
          update: function (frameState) {
            frameState.commandList.push(command);
          },
          isDestroyed: function () {
            return false;
          },
          destroy: function () {},
        };
      }

      function createBox(color) {
        return new Primitive({
          geometryInstances: new GeometryInstance({
            geometry: BoxGeometry.fromDimensions({
              vertexFormat: PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
              dimensions: new Cartesian3(20.0, 20.0, 20.0),
            }),
            modelMatrix: Transforms.eastNorthUpToFixedFrame(ahead(100.0)),
            attributes: {
              color: ColorGeometryInstanceAttribute.fromColor(color),
            },
            id: "box",
          }),
          appearance: new PerInstanceColorAppearance({
            flat: true,
            translucent: false,
          }),
          asynchronous: false,
        });
      }

      function createPixelSpecs(oit) {
        describe(`with order-independent translucency ${oit ? "on" : "off"}`, function () {
          createScenes({ oit: oit });

          let quad;
          function addRawQuadRenderer(z, color, scramble) {
            scene.externalRenderers.add(
              new ExternalRenderer({
                render: function (parameters) {
                  const gl = parameters.gl;
                  quad = quad ?? createRawQuad(gl);
                  if (defined(z)) {
                    drawRawQuad(gl, quad, z, color);
                  }
                  if (scramble) {
                    scrambleState(gl, quad);
                  }
                },
                boundingVolume: new BoundingSphere(ahead(100.0), 10.0),
              }),
            );
          }

          afterAll(function () {
            quad = undefined;
          });

          it("draws into the scene's frame", function () {
            addRawQuadRenderer(0.0, Color.LIME);
            expect(scene).toRender([0, 255, 0, 255]);
          });

          it("is hidden by opaque geometry in front of it", function () {
            scene.primitives.add(
              createQuadCommand(Pass.OPAQUE, 0.0, Color.RED),
            );
            addRawQuadRenderer(0.5, Color.LIME);
            expect(scene).toRender([255, 0, 0, 255]);
          });

          it("hides opaque geometry behind it", function () {
            scene.primitives.add(
              createQuadCommand(Pass.OPAQUE, 0.0, Color.RED),
            );
            addRawQuadRenderer(-0.5, Color.LIME);
            expect(scene).toRender([0, 255, 0, 255]);
          });

          it("hides translucent geometry behind it", function () {
            addRawQuadRenderer(-0.5, Color.LIME);
            scene.primitives.add(
              createQuadCommand(Pass.TRANSLUCENT, 0.0, Color.BLUE),
            );
            expect(scene).toRender([0, 255, 0, 255]);
          });

          it("is covered by translucent geometry in front of it", function () {
            addRawQuadRenderer(0.5, Color.LIME);
            scene.primitives.add(
              createQuadCommand(Pass.TRANSLUCENT, 0.0, Color.BLUE),
            );
            expect(scene).toRenderAndCall(function (rgba) {
              expect(rgba[1]).toBeLessThan(8);
              expect(rgba[2]).toBeGreaterThan(247);
            });
          });

          it("leaves Cesium's drawing after it unharmed when it changes the WebGL state", function () {
            addRawQuadRenderer(undefined, undefined, true);
            const box = scene.primitives.add(createBox(Color.RED));
            const translucent = scene.primitives.add(
              createQuadCommand(
                Pass.TRANSLUCENT,
                -0.5,
                new Color(0, 0, 1, 0.5),
              ),
            );

            // The translucent pass and the final copy to the screen run after
            // the renderer has changed the state in this frame; the clears,
            // the opaque passes and picking after it changed the state in the
            // frame before.
            scene.renderForSpecs();
            expect(scene).toRenderAndCall(function (rgba) {
              expect(rgba[0]).toBeGreaterThan(100);
              expect(rgba[0]).toBeLessThan(155);
              expect(rgba[1]).toEqual(0);
              expect(rgba[2]).toBeGreaterThan(100);
              expect(rgba[2]).toBeLessThan(155);
              expect(rgba[3]).toEqual(255);
            });

            scene.primitives.remove(translucent);
            expect(scene).toRender([255, 0, 0, 255]);
            expect(scene).toPickPrimitive(box);

            scene.primitives.remove(box);
            expect(scene).toRender([0, 0, 0, 255]);
          });
        });
      }

      createPixelSpecs(true);
      createPixelSpecs(false);
    }
  },
  "WebGL",
);
