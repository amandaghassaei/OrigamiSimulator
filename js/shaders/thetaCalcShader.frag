#define TWO_PI 6.283185307179586476925286766559
precision mediump float;
uniform vec2 u_textureDim;
uniform vec2 u_textureDimFaces;
uniform vec2 u_textureDimCreases;
uniform sampler2D u_normals;
uniform sampler2D u_lastTheta;
uniform sampler2D u_creaseVectors;
uniform sampler2D u_lastPosition;
uniform sampler2D u_originalPosition;
uniform float u_dt;

vec4 getFromArray(float index1D, vec2 dimensions, sampler2D tex){
  vec2 index = vec2(mod(index1D, dimensions.x)+0.5, floor(index1D/dimensions.x)+0.5);
  vec2 scaledIndex = index/dimensions;
  return texture2D(tex, scaledIndex);
}

void main(){

  vec2 fragCoord = gl_FragCoord.xy;
  vec2 scaledFragCoord = fragCoord/u_textureDimCreases;

  vec4 lastTheta = texture2D(u_lastTheta, scaledFragCoord);

  if (lastTheta[2]<0.0){
    gl_FragColor = vec4(lastTheta[0], 0.0, -1.0, -1.0);
    return;
  }

  vec3 normal1 = getFromArray(lastTheta[2], u_textureDimFaces, u_normals).xyz;
  vec3 normal2 = getFromArray(lastTheta[3], u_textureDimFaces, u_normals).xyz;

  float dotNormals = dot(normal1, normal2);//normals are already normalized, no need to divide by length
  if (dotNormals < -1.0) dotNormals = -1.0;
  else if (dotNormals > 1.0) dotNormals = 1.0;

  vec2 creaseVectorIndices = texture2D(u_creaseVectors, scaledFragCoord).xy;
  vec2 creaseNodeIndex = vec2(mod(creaseVectorIndices[0], u_textureDim.x)+0.5, floor(creaseVectorIndices[0]/u_textureDim.x)+0.5);
  vec2 scaledNodeIndex = creaseNodeIndex/u_textureDim;
  vec3 node0 = texture2D(u_lastPosition, scaledNodeIndex).xyz + texture2D(u_originalPosition, scaledNodeIndex).xyz;
  creaseNodeIndex = vec2(mod(creaseVectorIndices[1], u_textureDim.x)+0.5, floor(creaseVectorIndices[1]/u_textureDim.x)+0.5);
  scaledNodeIndex = creaseNodeIndex/u_textureDim;
  vec3 node1 = texture2D(u_lastPosition, scaledNodeIndex).xyz + texture2D(u_originalPosition, scaledNodeIndex).xyz;

  //https://math.stackexchange.com/questions/47059/how-do-i-calculate-a-dihedral-angle-given-cartesian-coordinates
  vec3 creaseVector = normalize(node1-node0);
  float x = dotNormals;
  float y = dot(cross(normal1, creaseVector), normal2);

  float theta = atan(y, x);

  float diff = theta-lastTheta[0];
  float origDiff = diff;
  if (diff < -5.0) {
    diff += TWO_PI;
  } else if (diff > 5.0) {
    diff -= TWO_PI;
  }
  theta = lastTheta[0] + diff;
  gl_FragColor = vec4(theta, diff, lastTheta[2], lastTheta[3]);//[theta, w, normal1Index, normal2Index]
}
