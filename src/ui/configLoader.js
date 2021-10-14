import { parseCSV, exportToCsv } from "../helpers";

export class configUI {
    constructor(robot) {
        this.robot = robot;
        let loadJoints = (data) => {
            data.shift();
            data.forEach(joint => {
                if (joint[1] !== "N/A")
                    robot.setJointValue(joint[0], joint[4]);
                updateSliders();
            })
        }
        let getCSVText = () => {
            let csvJoints = [["Joint Name", "Type", "Min", "Max", "Configuration"]];
            let jointArr = Object.entries(robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
            jointArr.forEach(joint => {
                csvJoints.push([
                    joint[0],
                    joint[1]._jointType,
                    joint[1].limit.lower,
                    joint[1].limit.upper,
                    joint[1].jointValue[0]
                ])
            })
            return csvJoints;
        }
        let configLoader = createFileUploader("Upload Config", "inputs", [".csv"]);
        configLoader.onchange = () => {
            if (configLoader.files.length > 0) {
                parseCSV(configLoader.files[0], loadJoints);
            }
        }
        let exportButton = createButton("exportButton", "inputs", "Export Configs", () => {exportToCsv(getCSVText(), "robotConfigs.csv")})
    }
}