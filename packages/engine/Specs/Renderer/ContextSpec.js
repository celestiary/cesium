import {
  Color,
  IndexDatatype,
  Buffer,
  BufferUsage,
  Context,
  ContextLimits,
  ClearCommand,
  PixelFormat,
  PixelDatatype,
} from "../../index.js";

import createContext from "../../../../Specs/createContext.js";

describe(
  "Renderer/Context",
  function () {
    let context;
    const webglStub = !!window.webglStub;

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    it("has a unique ID", function () {
      const c = createContext();
      expect(c.id).toBeDefined();
      expect(c.id).not.toEqual(context.id);
      c.destroyForSpecs();
    });

    it("get canvas", function () {
      expect(context.canvas).not.toBeNull();
    });

    it("get stencilBits", function () {
      expect(context.stencilBits).toBeGreaterThanOrEqual(0);
    });

    it("get maximumCombinedTextureImageUnits", function () {
      expect(
        ContextLimits.maximumCombinedTextureImageUnits,
      ).toBeGreaterThanOrEqual(32);
    });

    it("get maximumCubeMapSize", function () {
      expect(ContextLimits.maximumCubeMapSize).toBeGreaterThanOrEqual(2048);
    });

    it("get maximumFragmentUniformVectors", function () {
      expect(
        ContextLimits.maximumFragmentUniformVectors,
      ).toBeGreaterThanOrEqual(224);
    });

    it("get maximumTextureImageUnits", function () {
      expect(ContextLimits.maximumTextureImageUnits).toBeGreaterThanOrEqual(16);
    });

    it("get maximumRenderbufferSize", function () {
      expect(ContextLimits.maximumRenderbufferSize).toBeGreaterThanOrEqual(
        2048,
      );
    });

    it("get maximumTextureSize", function () {
      expect(ContextLimits.maximumTextureSize).toBeGreaterThanOrEqual(2048);
    });

    it("get maximum3DTextureSize", function () {
      expect(ContextLimits.maximum3DTextureSize).toBeGreaterThanOrEqual(256);
    });

    it("get maximumVaryingVectors", function () {
      expect(ContextLimits.maximumVaryingVectors).toBeGreaterThanOrEqual(15);
    });

    it("get maximumVertexAttributes", function () {
      expect(ContextLimits.maximumVertexAttributes).toBeGreaterThanOrEqual(16);
    });

    it("get maximumVertexTextureImageUnits", function () {
      expect(
        ContextLimits.maximumVertexTextureImageUnits,
      ).toBeGreaterThanOrEqual(16);
    });

    it("get maximumVertexUniformVectors", function () {
      expect(ContextLimits.maximumVertexUniformVectors).toBeGreaterThanOrEqual(
        256,
      );
    });

    it("get minimumAliasedLineWidth", function () {
      expect(ContextLimits.minimumAliasedLineWidth).toBeLessThanOrEqual(1);
    });

    it("get maximumAliasedLineWidth", function () {
      expect(ContextLimits.maximumAliasedLineWidth).toBeGreaterThanOrEqual(1);
    });

    it("get minimumAliasedPointSize", function () {
      expect(ContextLimits.minimumAliasedPointSize).toBeLessThanOrEqual(1);
    });

    it("get maximumAliasedPointSize", function () {
      expect(ContextLimits.maximumAliasedPointSize).toBeGreaterThanOrEqual(1);
    });

    it("get maximumViewportWidth", function () {
      expect(ContextLimits.maximumViewportWidth).toBeGreaterThan(0);
    });

    it("get maximumViewportHeight", function () {
      expect(ContextLimits.maximumViewportHeight).toBeGreaterThan(0);
    });

    it("gets antialias", function () {
      const c = createContext({
        webgl: {
          antialias: false,
        },
      });
      expect(c.antialias).toEqual(false);
      c.destroyForSpecs();
    });

    it("gets the standard derivatives extension", function () {
      let fs = "";

      if (context.standardDerivatives && !context.webgl2) {
        fs += "#extension GL_OES_standard_derivatives : enable\n";
      }

      fs += "void main()\n" + "{\n";

      if (context.standardDerivatives) {
        fs += "  out_FragColor = vec4(dFdx(1.0), dFdy(1.0), 1.0, 1.0);\n";
      } else {
        fs += "  out_FragColor = vec4(1.0);\n";
      }

      fs += "}";

      const expected = context.standardDerivatives
        ? [0, 0, 255, 255]
        : [255, 255, 255, 255];
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender(expected);
    });

    it("gets the element index uint extension", function () {
      if (context.elementIndexUint) {
        const buffer = Buffer.createIndexBuffer({
          context: context,
          sizeInBytes: 6,
          usage: BufferUsage.STREAM_DRAW,
          indexDatatype: IndexDatatype.UNSIGNED_INT,
        });
        expect(buffer).toBeDefined();
        buffer.destroy();
      } else {
        expect(function () {
          Buffer.createIndexBuffer({
            context: context,
            sizeInBytes: 6,
            usage: BufferUsage.STREAM_DRAW,
            indexDatatype: IndexDatatype.UNSIGNED_INT,
          });
        }).toThrowDeveloperError();
      }
    });

    it("gets the depth texture extension", function () {
      expect(context.depthTexture).toBeDefined();
    });

    it("gets the texture float extension", function () {
      expect(context.floatingPointTexture).toBeDefined();
    });

    it("gets texture filter anisotropic extension", function () {
      expect(context.textureFilterAnisotropic).toBeDefined();
    });

    it("gets texture filter anisotropic extension", function () {
      expect(context.textureFilterAnisotropic).toBeDefined();
    });

    it("gets maximum texture filter anisotropy", function () {
      if (context.textureFilterAnisotropic) {
        expect(
          ContextLimits.maximumTextureFilterAnisotropy,
        ).toBeGreaterThanOrEqual(2);
      } else {
        expect(ContextLimits.maximumTextureFilterAnisotropy).toEqual(1);
      }
    });

    it("gets vertex array object extension", function () {
      expect(context.vertexArrayObject).toBeDefined();
    });

    it("get the fragment depth extension", function () {
      if (context.fragmentDepth && !context.webgl2) {
        return;
      }

      const fs =
        "void main()\n" +
        "{\n" +
        "  out_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n" +
        "}";

      expect({
        context: context,
        fragmentShader: fs,
        depth: 0.5,
      }).contextToRender([255, 0, 0, 255]);

      let fsFragDepth = "#extension GL_EXT_frag_depth : enable\n";

      fsFragDepth +=
        "void main()\n" +
        "{\n" +
        "    out_FragColor = vec4(0.0, 1.0, 0.0, 1.0);\n";

      if (context.fragmentDepth) {
        fsFragDepth += "    gl_FragDepth";
        if (!context.webgl2) {
          fsFragDepth += "EXT";
        }
        fsFragDepth += " = 0.0;\n";
      }

      fsFragDepth += "}\n";

      const expected = [0, 255, 0, 255];
      expect({
        context: context,
        fragmentShader: fsFragDepth,
        depth: 1.0,
        clear: false,
      }).contextToRender(expected);
    });

    it("get the draw buffers extension", function () {
      expect(context.drawBuffers).toBeDefined();
    });

    it("get the maximum number of draw buffers", function () {
      if (context.drawBuffers) {
        expect(ContextLimits.maximumDrawBuffers).toBeGreaterThanOrEqual(1);
      } else {
        expect(ContextLimits.maximumDrawBuffers).toEqual(1);
      }
    });

    it("get the maximum number of color attachments", function () {
      if (context.drawBuffers) {
        expect(ContextLimits.maximumColorAttachments).toBeGreaterThanOrEqual(4);
      } else {
        expect(ContextLimits.maximumColorAttachments).toEqual(1);
      }
    });

    it("can create a pick ID and retrieve an object by pick color", function () {
      const o = {};
      const pickId = context.createPickId(o);

      expect(pickId).toBeDefined();
      expect(context.getObjectByPickColor(pickId.color.toRgba())).toBe(o);
    });

    it("throws when creating a pick ID without an object", function () {
      expect(function () {
        context.createPickId(undefined);
      }).toThrowDeveloperError();
    });

    it("returns undefined when retrieving an object by unknown pick color", function () {
      expect(context.getObjectByPickColor(Color.WHITE)).toBeUndefined();
    });

    it("throws when getObjectByPickColor is called without a color", function () {
      expect(function () {
        context.getObjectByPickColor(undefined);
      }).toThrowDeveloperError();
    });

    it("fails to construct (null canvas)", function () {
      expect(function () {
        return new Context();
      }).toThrowDeveloperError();
    });

    it("isDestroyed", function () {
      const c = createContext();
      expect(c.isDestroyed()).toEqual(false);
      c.destroyForSpecs();
      expect(c.isDestroyed()).toEqual(true);
    });

    it("destroying Context destroys objects in cache", function () {
      const c = createContext();
      const destroyableObject = jasmine.createSpyObj("destroyableObject", [
        "destroy",
      ]);
      c.cache.foo = destroyableObject;
      c.destroyForSpecs();
      expect(destroyableObject.destroy).toHaveBeenCalled();
    });

    it("non-destroyable objects are allowed in the cache", function () {
      const c = createContext();
      const nonDestroyableObject = {};
      c.cache.foo = nonDestroyableObject;
      c.destroyForSpecs();
    });

    it("returns the underling drawingBufferWidth", function () {
      const c = createContext(undefined, 1024, 768);
      expect(c.drawingBufferWidth).toBe(1024);
      c.destroyForSpecs();
    });

    it("returns the underling drawingBufferHeight", function () {
      const c = createContext(undefined, 1024, 768);
      expect(c.drawingBufferHeight).toBe(768);
      c.destroyForSpecs();
    });

    it("requestWebgl1 works", function () {
      const c1 = createContext({
        requestWebgl1: true,
      });
      expect(c1._webgl2).toBe(false);

      if (!webglStub) {
        const c2 = createContext({
          requestWebgl1: false,
        });
        expect(c2._webgl2).toBe(true);
      }
    });

    it("readPixels", function () {
      if (webglStub) {
        return;
      }
      const c = createContext();
      const command = new ClearCommand({
        color: Color.WHITE,
      });
      command.execute(c);
      const pixels = c.readPixels();
      expect(pixels).toBeDefined();
      expect(pixels).toEqual([255, 255, 255, 255]);
      c.destroyForSpecs();
    });

    it("readPixels using PBO", function () {
      if (webglStub) {
        return;
      }
      const c = createContext();
      if (!c.webgl2) {
        return;
      }
      const command = new ClearCommand({
        color: Color.WHITE,
      });
      command.execute(c);
      const pixelBuffer = c.readPixelsToPBO({
        width: 1,
        height: 1,
      });
      const pixels = PixelFormat.createTypedArray(
        PixelFormat.RGBA,
        PixelDatatype.UNSIGNED_BYTE,
        1,
        1,
      );
      pixelBuffer.getBufferData(pixels);
      pixelBuffer.destroy();
      expect(pixels).toBeDefined();
      expect(pixels).toEqual([255, 255, 255, 255]);
      c.destroyForSpecs();
    });

    it(`readPixels using PBO throws without WebGL 2`, function () {
      if (webglStub) {
        return;
      }
      const c = createContext({
        requestWebgl1: true,
      });
      expect(function () {
        c.readPixelsToPBO();
      }).toThrowDeveloperError(
        "A WebGL 2 context is required to read pixels using a PBO.",
      );
      c.destroyForSpecs();
    });

    function createLinkedProgram(gl) {
      const program = gl.createProgram();
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, "void main() { gl_Position = vec4(0.0); }");
      gl.compileShader(vs);
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, "void main() { gl_FragColor = vec4(1.0); }");
      gl.compileShader(fs);
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      return program;
    }

    // Changes the WebGL state as code outside Cesium might.
    function scrambleState(gl) {
      gl.useProgram(createLinkedProgram(gl));
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer());
      gl.bindRenderbuffer(gl.RENDERBUFFER, gl.createRenderbuffer());
      gl.activeTexture(gl.TEXTURE3);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ZERO, gl.ZERO);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.FRONT_AND_BACK);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.NEVER);
      gl.depthMask(false);
      gl.enable(gl.STENCIL_TEST);
      gl.stencilFunc(gl.NEVER, 1, 0xff);
      gl.stencilMask(0);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, 0, 0, 0);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
      gl.disable(gl.DITHER);
      gl.colorMask(false, false, false, false);
      gl.viewport(0, 0, 0, 0);
      gl.clearColor(1.0, 0.0, 1.0, 1.0);
      gl.clearDepth(0.0);
      gl.clearStencil(1);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      if (context.vertexArrayObject) {
        context.glBindVertexArray(context.glCreateVertexArray());
      }
      if (context.webgl2) {
        gl.bindSampler(0, gl.createSampler());
        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, gl.createBuffer());
        gl.bindBuffer(gl.UNIFORM_BUFFER, gl.createBuffer());
        gl.enable(gl.RASTERIZER_DISCARD);
        gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 7);
      }
    }

    it("resetState restores the WebGL state the context assumes", function () {
      if (webglStub) {
        return;
      }
      const gl = context._gl;
      scrambleState(gl);

      context.resetState();

      expect(gl.getParameter(gl.CURRENT_PROGRAM)).toBeNull();
      expect(gl.getParameter(gl.ARRAY_BUFFER_BINDING)).toBeNull();
      expect(gl.getParameter(gl.FRAMEBUFFER_BINDING)).toBeNull();
      expect(gl.getParameter(gl.RENDERBUFFER_BINDING)).toBeNull();
      expect(gl.getParameter(gl.ACTIVE_TEXTURE)).toEqual(gl.TEXTURE0);
      expect(gl.isEnabled(gl.BLEND)).toBe(false);
      expect(gl.isEnabled(gl.CULL_FACE)).toBe(false);
      expect(gl.isEnabled(gl.DEPTH_TEST)).toBe(false);
      expect(gl.isEnabled(gl.STENCIL_TEST)).toBe(false);
      expect(gl.isEnabled(gl.SCISSOR_TEST)).toBe(false);
      expect(gl.isEnabled(gl.POLYGON_OFFSET_FILL)).toBe(false);
      expect(gl.isEnabled(gl.SAMPLE_ALPHA_TO_COVERAGE)).toBe(false);
      expect(gl.isEnabled(gl.DITHER)).toBe(true);
      expect(gl.getParameter(gl.DEPTH_WRITEMASK)).toBe(true);
      expect(gl.getParameter(gl.STENCIL_WRITEMASK)).not.toEqual(0);
      expect(gl.getParameter(gl.COLOR_WRITEMASK)).toEqual([
        true,
        true,
        true,
        true,
      ]);
      expect(Array.from(gl.getParameter(gl.VIEWPORT))).toEqual([
        0,
        0,
        context.drawingBufferWidth,
        context.drawingBufferHeight,
      ]);
      expect(Array.from(gl.getParameter(gl.COLOR_CLEAR_VALUE))).toEqual([
        0, 0, 0, 0,
      ]);
      expect(gl.getParameter(gl.DEPTH_CLEAR_VALUE)).toEqual(1.0);
      expect(gl.getParameter(gl.STENCIL_CLEAR_VALUE)).toEqual(0);
      expect(gl.getParameter(gl.UNPACK_ALIGNMENT)).toEqual(4);
      expect(gl.getParameter(gl.PACK_ALIGNMENT)).toEqual(4);
      expect(gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL)).toBe(false);
      expect(gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL)).toBe(false);
      if (context.vertexArrayObject && context.webgl2) {
        expect(gl.getParameter(gl.VERTEX_ARRAY_BINDING)).toBeNull();
      }
      if (context.webgl2) {
        expect(gl.getParameter(gl.SAMPLER_BINDING)).toBeNull();
        expect(gl.getParameter(gl.PIXEL_UNPACK_BUFFER_BINDING)).toBeNull();
        expect(gl.getParameter(gl.UNIFORM_BUFFER_BINDING)).toBeNull();
        expect(gl.isEnabled(gl.RASTERIZER_DISCARD)).toBe(false);
        expect(gl.getParameter(gl.UNPACK_ROW_LENGTH)).toEqual(0);
      }
    });

    it("clears and draws correctly after resetState", function () {
      if (webglStub) {
        return;
      }
      // Clear once so the context caches the clear colour, then change the
      // WebGL state behind its back.
      context.clear(
        new ClearCommand({
          color: new Color(0.0, 0.0, 1.0, 1.0),
        }),
      );
      expect(context).toReadPixels([0, 0, 255, 255]);

      scrambleState(context._gl);
      context.resetState();

      context.clear(
        new ClearCommand({
          color: new Color(0.0, 0.0, 1.0, 1.0),
        }),
      );
      expect(context).toReadPixels([0, 0, 255, 255]);

      const fs = "void main() { out_FragColor = vec4(0.0, 1.0, 0.0, 1.0); }";
      const command = context.createViewportQuadCommand(fs);
      command.execute(context);
      expect(context).toReadPixels([0, 255, 0, 255]);
      command.shaderProgram.destroy();
    });
  },
  "WebGL",
);
