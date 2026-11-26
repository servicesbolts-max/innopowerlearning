// Public API of the credentials module. Other modules import only from this file.
export {
  CERTIFICATE_CODE,
  certificateCount,
  getCertificateByCode,
  issueCertificate,
  listMyCertificates,
  newCertificateCode,
  type Certificate,
} from "./certificates";
