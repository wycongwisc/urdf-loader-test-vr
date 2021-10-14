// import URDFLoader from 'urdf-loader';
import { lerp } from "../helpers";

export function animateRobot (time, robot, animationTable) {
    if (animationTable.length == 0) {
        return;
    }
    let endTime = animationTable[animationTable.length-1][0];
    let jointArr = animationTable.shift();
    // let jointArr = Object.entries(robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
    // sawyer exception splice head joint
    // jointArr.splice(1, 1);
    if (time == 0) {
        for (let i = 1; i < jointArr.length; i++) {
            robot.setJointValue(jointArr[i], animationTable[0][i])
        }
    }
    else if (time >= endTime) {
        for (let i = 1; i < jointArr.length; i++) {
            // robot.setJointValue(jointArr[i - 1][0], animationTable[animationTable.length - 1][i]);
            robot.setJointValue(jointArr[i], animationTable[animationTable.length - 1][i]);

        }
    }
    else {
        let upperIndex = animationTable.findIndex(row => row[0] >= time)
        if (upperIndex <= 0) {
            return;
        }
        else if (animationTable[upperIndex][0] == time) {
            for (let i = 1; i < jointArr.length; i++) {
                // robot.setJointValue(jointArr[i - 1][0], animationTable[upperIndex][i]);
                robot.setJointValue(jointArr[i], animationTable[upperIndex][i]);
            }
        }
        let lowerIndex = upperIndex - 1;
        let interval = animationTable[upperIndex][0] - animationTable[lowerIndex][0];
        let t = (time - animationTable[lowerIndex][0]) / interval;

        for (let i = 1; i < jointArr.length; i++) {
            let jointValue = lerp(animationTable[lowerIndex][i], animationTable[upperIndex][i], t);
            // robot.setJointValue(jointArr[i - 1][0], jointValue);
            robot.setJointValue(jointArr[i], jointValue);
        }
    }
    animationTable.unshift(jointArr);
    // updateSliders();
}