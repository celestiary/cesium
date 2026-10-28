in vec4 position;
in vec2 textureCoordinates;

out vec2 v_textureCoordinates;

// Declared and never applied: a NetGL host that reprojects a late frame
// leaves the full-screen copies where they are (portal-netgl's opt-in).
uniform mat4 netgl_reproject;

void main() 
{
    gl_Position = position;
    v_textureCoordinates = textureCoordinates;
}
