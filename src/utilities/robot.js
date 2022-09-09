import * as T from 'three';
import { EE_TO_GRIPPER_OFFSET, EE_TO_THREE_ROT_OFFSET } from './globals'

export function recurseMaterialTraverse(material, func) {
    if (material.length > 1) {
        material.forEach(mat => {
            recurseMaterialTraverse(mat, func);
        })
    } else {
        func(material);
    }
}

export function computeGripper(eePose) {
    const gripper = new T.Object3D();
    gripper.position.copy(new T.Vector3(eePose.posi.x, eePose.posi.y, eePose.posi.z));
    gripper.quaternion.copy(new T.Quaternion(eePose.ori.x, eePose.ori.y, eePose.ori.z, eePose.ori.w));
    gripper.quaternion.multiply(EE_TO_THREE_ROT_OFFSET);
    gripper.translateX(EE_TO_GRIPPER_OFFSET); // get tip of the gripper
    return gripper;
}

export function getCurrEEPose() {
    return {
        'posi': window.robot.links.right_hand.getWorldPosition(new T.Vector3()),
        'ori': window.robot.links.right_hand.getWorldQuaternion(new T.Quaternion())
    }
}

export function getGripperPose(tip = false) {
    const gripper = new T.Object3D();
        gripper.position.copy(new T.Vector3(eePose.posi.x, eePose.posi.y, eePose.posi.z));
        gripper.quaternion.copy(new T.Quaternion(eePose.ori.x, eePose.ori.y, eePose.ori.z, eePose.ori.w).normalize());
        return gripper;
}

/**
 * 
 * @param {*} goalEERelRos 
 * @returns True if the robot is updated, false otherwise
 */
export function updateRobot() {
    const goalEERelRos = changeReferenceFrame(window.goalEERelThree, T_ROS_to_THREE);
    const currEEAbsThree = getCurrEEPose();

    const deltaPosi = currEEAbsThree.posi.distanceTo(goalEERelRos.posi); // distance difference
    const deltaOri = currEEAbsThree.ori.angleTo(goalEERelRos.ori); // angle difference

    if (deltaPosi > 1e-3 || deltaOri > 1e-3) {
        const result = window.relaxedIK.solve(
            [goalEERelRos.posi.x, goalEERelRos.posi.y, goalEERelRos.posi.z], 
            [goalEERelRos.ori.w, goalEERelRos.ori.x, goalEERelRos.ori.y, goalEERelRos.ori.z]
        );

        const joints = Object.entries(window.robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
        joints.forEach(joint => {
            const jointIndex = window.robotInfo.joint_ordering.indexOf(joint[0]);
            if (jointIndex != -1) window.robot.setJointValue(joint[0], result[jointIndex]);
        })

        window.linkToRigidBody.forEach((rigidBody, link) => {
            rigidBody.setNextKinematicTranslation(link.getWorldPosition(new T.Vector3()));
            rigidBody.setNextKinematicRotation(link.getWorldQuaternion(new T.Quaternion()));
        })
        return true;   
    }
    return false;
}

export function resetRobot() {
    window.goalEERelThree = { 'posi': new T.Vector3(), 'ori': new T.Quaternion().identity() };
    window.relaxedIK.recover_vars([]);
    updateRobot();
    updateTargetCursor();
}

export function updateTargetCursor() {
    const goalEEAbsThree = relToAbs(window.goalEERelThree, window.initEEAbsThree);
    window.targetCursor.position.copy(goalEEAbsThree.posi);
    window.targetCursor.quaternion.copy(goalEEAbsThree.ori);
    window.targetCursor.matrixWorldNeedsUpdate = true;
}