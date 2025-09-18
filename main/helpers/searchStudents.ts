import leerlingenData from '../../resources/leerlingen.json';

type Student = {
  student: string;
  firstName: string;
  prefix: string;
  lastName: string;
};

export function searchStudents(query: string) {
  const lowerCaseQuery = query.toLowerCase();
  return leerlingenData
    .filter((student: Student) => {
      const fullName =
        `${student.firstName} ${student.prefix} ${student.lastName}`
          .trim()
          .toLowerCase();
      return (
        fullName.includes(lowerCaseQuery) ||
        student.student.includes(lowerCaseQuery)
      );
    })
    .map((student: Student) => {
      const fullName =
        `${student.firstName} ${student.prefix} ${student.lastName}`.trim();
      return `${fullName} (${student.student})`;
    });
}