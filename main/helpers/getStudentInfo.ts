import leerlingenData from '../../resources/leerlingen.json';

type Student = {
  student: string;
  firstName: string;
  prefix: string;
  lastName: string;
};

export function getStudentInfo(id: string) {
  return leerlingenData.find((student: Student) => student.student === id);
}