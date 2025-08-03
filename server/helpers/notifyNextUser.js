// server/helpers/notifyNextUser.js
const sendTaskEmail = require('../utils/sendTaskEmail');

async function notifyNextUser(caseData) {
  const { status, enquiry_no } = caseData;

  if (status === 'New' && caseData.technical_recipient_mail_id) {
    await sendTaskEmail({
      to: caseData.technical_recipient_mail_id,
      recipientName: 'Technical Team',
      message: `You have been assigned a new enquiry: <strong>${enquiry_no}</strong>`,
      link: `http://localhost:3000/enquiry/${caseData.id}`
    });
  }

  if (status === 'Technical Submitted' && caseData.technical_approver_mail_id) {
    await sendTaskEmail({
      to: caseData.technical_approver_mail_id,
      recipientName: 'Technical Approver',
      message: `Please review the technical submission for Enquiry: <strong>${enquiry_no}</strong>`,
      link: `http://localhost:3000/enquiry/${caseData.id}`
    });
  }

  if (status === 'Technical Approved' && caseData.estimation_recipient_mail_id) {
    await sendTaskEmail({
      to: caseData.estimation_recipient_mail_id,
      recipientName: 'Estimation Team',
      message: `Please prepare estimation for Enquiry: <strong>${enquiry_no}</strong>`,
      link: `http://localhost:3000/enquiry/${caseData.id}`
    });
  }

  if (status === 'Estimation Submitted' && caseData.estimation_approver_mail_id) {
    await sendTaskEmail({
      to: caseData.estimation_approver_mail_id,
      recipientName: 'Estimation Approver',
      message: `Please review the estimation for Enquiry: <strong>${enquiry_no}</strong>`,
      link: `http://localhost:3000/enquiry/${caseData.id}`
    });
  }

  if (status === 'Estimation Approved' && caseData.proposal_creator_mail_id) {
    await sendTaskEmail({
      to: caseData.proposal_creator_mail_id,
      recipientName: 'Proposal Creator',
      message: `Please submit the proposal for Enquiry: <strong>${enquiry_no}</strong>`,
      link: `http://localhost:3000/enquiry/${caseData.id}`
    });
  }

  if (status === 'Proposal Submitted' && caseData.proposal_approver_mail_id) {
    await sendTaskEmail({
      to: caseData.proposal_approver_mail_id,
      recipientName: 'Proposal Approver',
      message: `Please review and approve the proposal for Enquiry: <strong>${enquiry_no}</strong>`,
      link: `http://localhost:3000/enquiry/${caseData.id}`
    });
  }

  // Add more cases (e.g. rejected/referral) as needed
}

module.exports = notifyNextUser;
