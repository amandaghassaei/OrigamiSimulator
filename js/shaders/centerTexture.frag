precision mediump float;
uniform sampler2D u_lastPosition;
uniform vec2 u_textureDim;
uniform vec3 u_center;
void main(){
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 scaledFragCoord = fragCoord/u_textureDim;
  vec3 position = texture2D(u_lastPosition, scaledFragCoord).xyz;
  gl_FragColor = vec4(position-u_center, 0.0);
}
