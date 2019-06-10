precision mediump float;
uniform sampler2D u_theta;
uniform vec2 u_textureDimCreases;
void main(){
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 scaledFragCoord = fragCoord/u_textureDimCreases;
  vec4 theta = texture2D(u_theta, scaledFragCoord);
  gl_FragColor = vec4(0.0, 0.0, theta[2], theta[3]);
}
