import {
  DerivedCommand,
  DrawCommand,
  ShaderProgram,
  ShaderSource,
} from "../../index.js";

import createContext from "../../../../Specs/createContext.js";

describe(
  "Scene/DerivedCommand",
  function () {
    let context;

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    function createCommand(vs) {
      const shaderProgram = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: new ShaderSource({ sources: [vs] }),
        fragmentShaderSource: new ShaderSource({
          sources: ["void main() { out_FragColor = vec4(1.0); }"],
        }),
        attributeLocations: { position: 0 },
      });
      return new DrawCommand({ shaderProgram: shaderProgram });
    }

    it("a log-depth vertex shader applies netgl_reproject before czm_vertexLogDepth", function () {
      const command = createCommand(
        "in vec4 position; void main() { gl_Position = czm_modelViewProjection * position; }",
      );
      const derived = DerivedCommand.createLogDepthCommand(command, context);
      const program = derived.command.shaderProgram;
      const source = program.vertexShaderSource.sources.join("\n");
      expect(source).toContain("uniform mat4 netgl_reproject;");
      const apply = source.indexOf(
        "gl_Position = netgl_reproject * gl_Position;",
      );
      expect(apply).toBeGreaterThan(source.indexOf("czm_log_depth_main();"));
      expect(apply).toBeLessThan(source.indexOf("czm_vertexLogDepth();"));
      // It compiles and links, and the uniform is active: set, by default
      // to the identity, as an automatic uniform.
      expect(program.allUniforms.netgl_reproject).toBeDefined();
    });

    it("a shader that writes its own log depth is left as it was", function () {
      const vs =
        "in vec4 position; void main() { gl_Position = czm_modelViewProjection * position; czm_vertexLogDepth(gl_Position); }";
      const derived = DerivedCommand.createLogDepthCommand(
        createCommand(vs),
        context,
      );
      const source =
        derived.command.shaderProgram.vertexShaderSource.sources.join("\n");
      expect(source).not.toContain("netgl_reproject");
    });
  },
  "WebGL",
);
