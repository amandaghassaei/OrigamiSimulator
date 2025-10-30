/**
 * Created by guodcz on 10/24/25
 */

function initStepFinder(globals) {

  /**
   * This function will read and modify model.creases to find the next
   * unfolding step. After the function is called, the only thing changed
   * should be the targetTheta of some creases.
   * 
   * In the meantime, it will maintain a queue of "mask" that indicates which
   * creases have been modified in "targetTheta" and "stiffness".
   * 
   * During the function call, the model will apply mask to temporarily
   * modify the crease properties. A mask that satisfies some criteria will
   * be applied to the model.creases, and the function will return.
   */
  function StepFinder() {
    // masks := []
    // for (crease of model.creases) {
    //   mask := {
    //     vanishCrease: crease,
    //     stifflessCreases: []
    //   }
    //   (instability, totalInstability) := apply(mask)
    //   mask := {
    //     ...mask, 
    //     instability,
    //     totalInstability
    //   }
    //   masks.push(mask)
    // }
    // 
    // for (i = 0; i < MAX_ITER; i++) {
      // for (mask of masks) {
      //   nextCrease := creases of highest instability in mask
      //   mask := {
      //     ...mask,
      //     stifflessCreases: mask.stifflessCreases + [nextCrease]
      //   }
      //   (instability, totalInstability) := apply(mask)
      //   if (totalInstability < threshold) {
      //     applyToModel(mask)
      //     return
      //   }
      //   mask := {
      //     ...mask, 
      //     instability,
      //     totalInstability
      //   }
      //   masks.push(mask)
      // }
    // }
  }
  return {
    StepFinder: StepFinder
  };
}


// function loop(i) {
//     if (i >= 100) {
//         return; // 循环结束
//     }
//     console.log("Paused at i =", i);
//     return () => {
//         console.log("Resuming i =", i);
//         return loop(i + 1);
//     };
// }

// // 使用示例
// let paused = loop(1)
// paused = paused();

// // 现在 paused 保存了暂停点
// // 需要恢复时：
// paused(); // 继续执行，输出 Resuming / After baz / 下一次迭代