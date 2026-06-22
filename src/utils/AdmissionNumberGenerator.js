import {buildStudentIdPayload, formatStudentId, normalizeBranchCode} from './studentIdGenerator';

export const formatAdmissionNumber = formatStudentId;

export const buildAdmissionNumberPayload = ({admissionYear, branchCode, lastSequence}) =>
  buildStudentIdPayload({
    admissionYear,
    branchCode: normalizeBranchCode(branchCode),
    lastSerialNumber: lastSequence,
  });

export default {
  buildAdmissionNumberPayload,
  formatAdmissionNumber,
};
