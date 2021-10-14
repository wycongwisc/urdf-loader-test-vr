import * as T from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Line2 } from 'three/examples/jsm/lines/Line2';

export class Line3D {
    constructor(scene, robot, color = "green") {
        this.scene = scene;
        this.points = [];
        this.pointConfigs = [];
        this.mesh = null;
        this.added = false;
        this.exists = true;
        this.material = new T.LineBasicMaterial({
            color: color,
            linewidth: 0.005,
        })
        this.robot = robot;
        this.hasPoints = false;
    }

    clearLine() {
        this.scene.remove(this.mesh);
        this.points = [];
        this.exists = false;
    }

    updateLine(newPos) {
        const minSegmentDistance = 0.0001;
        let robotJoints = Object.entries(this.robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
        if(this.added) {
            this.scene.remove(this.mesh);
            this.added = false;
        }
        this.points.push(newPos);
        let jointConfigs = [];
        robotJoints.forEach(joint => {
            jointConfigs.push({
                name: joint[0],
                angle: joint[1].jointValue[0]
            })
        })

        this.pointConfigs.push({
            configs: jointConfigs,
            position: newPos
        });
        if (this.points.length > 2) {
            let geometry = new T.BufferGeometry().setFromPoints(this.points);
            this.mesh = new T.Line(geometry, this.material);
        }
        if(this.exists && !this.added && this.mesh) {
            this.scene.add(this.mesh);
            this.added = true;
        }
    }

    // given a position, find the point on the line closest to it and set the robot to the what the position was at that time
    setRobotConfig(pos) {
        let leastDist = 100;
        let closestConfig;
        this.pointConfigs.forEach(data => {
            let dist = pos.distanceTo(data.position);
            if(dist < leastDist) {
                leastDist = dist;
                closestConfig = data;
            }
        })
        if(closestConfig) {
            closestConfig.configs.forEach(config => {
                this.robot.setJointValue(config.name, config.angle)
            })
        }
    }

    getMesh() {
        return this.mesh;
    }
}