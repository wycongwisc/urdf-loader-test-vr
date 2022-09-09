// import * as T from 'three';

// export default class GripperGoal {
//     constructor(params) {
//         this.position = params.position ?? new T.Vector3();
//         this.rotation = params.rotation ?? new T.Euler();
//         this.opacity = params.opacity ?? 0.4;

//         window.robot.traverse((child) => {
//             if (child.name === 'right_gripper_base') {
//                 this.mesh = child.clone();
//                 this.mesh.traverse((child) => {
//                     if (child.isMesh) {
//                         child.material = child.material instanceof Array ? 
//                             child.material.map((material) => material.clone()) : 
//                             child.material.clone();
//                     }
//                 })
//             }
//         })

//         this.mesh.position.copy(this.position);
//         this.mesh.rotation.copy(this.rotation);

//         this.mesh.traverse((child) => {
//             if (child.isMesh) {
//                 if (child.material instanceof Array) {
//                     child.material.forEach((item) => {
//                         item.transparent = true;
//                         item.opacity = this.opacity;
//                     })
//                 } else {
//                     child.material.transparent = true;
//                     child.material.opacity = this.opacity;
//                 }
//             }
//         })

//         this.mesh.add(new T.AxesHelper(0.2));
//     }

//     show() {
//         if (this.visible) return;
//         else this.visible = true;

//         window.scene.add(this.mesh);
//     }

//     hide() {
//         this.visible = false;

//         window.scene.remove(this.mesh);
//     }
// }
