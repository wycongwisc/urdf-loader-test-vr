import pickle
import csv
import sys

fileName = sys.argv[1]
print("in: " + fileName)

output = ""
if(len(sys.argv) >= 3):
    output = sys.argv[2]
    print("out: " + output)
else:
    output = fileName.replace("pkl", "csv")

f = open(fileName, 'rb')   # 'r' for reading; can be omitted
data = pickle.load(f)         # load file content as mydict
f.close()                       

# print(data.keys())
# print(data["joint_angle_solutions"])
# print(data["joint_angle_solutions_times"])
print(len(data["joint_angle_solutions"]))
print(len(data["joint_angle_solutions_times"]))

num1 = len(data["joint_angle_solutions"])
num2 = len(data["joint_angle_solutions_times"])
numElements = num1 if num1 < num2 else num2

numJoints = len(data["joint_angle_solutions"][0])
titleRow = ["time"]
for i in range(numJoints):
    col = "j" + str(i)
    titleRow.append(col)

with open(output, mode='w') as robotAnimations:
    writer = csv.writer(robotAnimations, delimiter = ',', quoting=csv.QUOTE_MINIMAL, lineterminator = '\n')
    writer.writerow(titleRow)
    for i in range(numElements):
        row = data["joint_angle_solutions"][i]
        row.insert(0, data["joint_angle_solutions_times"][i])
        writer.writerow(row)