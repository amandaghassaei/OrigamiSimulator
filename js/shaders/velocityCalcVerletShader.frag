precision mediump float;
uniform vec2 u_textureDim;
uniform float u_dt;
uniform sampler2D u_position;
uniform sampler2D u_lastPosition;
uniform sampler2D u_mass;

void main(){
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 scaledFragCoord = fragCoord/u_textureDim;

  float isFixed = texture2D(u_mass, scaledFragCoord).y;
  if (isFixed == 1.0){
    gl_FragColor = vec4(0.0);
    return;
  }

  vec3 position = texture2D(u_position, scaledFragCoord).xyz;
  vec3 lastPosition = texture2D(u_lastPosition, scaledFragCoord).xyz;
  gl_FragColor = vec4((position-lastPosition)/u_dt,0.0);
}
