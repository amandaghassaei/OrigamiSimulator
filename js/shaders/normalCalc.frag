precision mediump float;
uniform vec2 u_textureDim;
uniform vec2 u_textureDimFaces;
uniform sampler2D u_faceVertexIndices;
uniform sampler2D u_lastPosition;
uniform sampler2D u_originalPosition;

vec3 getPosition(float index1D){
  vec2 index = vec2(mod(index1D, u_textureDim.x)+0.5, floor(index1D/u_textureDim.x)+0.5);
  vec2 scaledIndex = index/u_textureDim;
  return texture2D(u_lastPosition, scaledIndex).xyz + texture2D(u_originalPosition, scaledIndex).xyz;
}

void main(){
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 scaledFragCoord = fragCoord/u_textureDimFaces;

  vec3 indices = texture2D(u_faceVertexIndices, scaledFragCoord).xyz;

  vec3 a = getPosition(indices[0]);
  vec3 b = getPosition(indices[1]);
  vec3 c = getPosition(indices[2]);

  vec3 normal = normalize(cross(b-a, c-a));

  gl_FragColor = vec4(normal, 0.0);
}
