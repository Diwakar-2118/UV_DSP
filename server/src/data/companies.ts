/**
 * Company profiles for interview preparation.
 * Overviews contain only broad, publicly known facts. Interview rounds describe a COMMON INDUSTRY PATTERN for
 * QA roles at companies of this type – they are NOT verified accounts of any company's process.
 * Always confirm on the company's official careers page.
 */
export interface CompanyProfile {
  key: string;
  name: string;
  overview: string;
  segment: string;
  website: string;
  typicalRoles: string[];
  skills: string[];
  focusCategories: string[];
  domainTopics: string[];
}

export const COMPANIES: CompanyProfile[] = [
  {
    key: 'razorpay', name: 'Razorpay', segment: 'Payment gateway & business banking', website: 'https://razorpay.com/jobs/',
    overview: 'Bengaluru-headquartered fintech offering online payment gateway, payment links, subscriptions and business banking products for Indian businesses.',
    typicalRoles: ['QA Engineer', 'SDET', 'API Test Engineer'], skills: ['API Testing', 'Postman', 'SQL', 'Automation (Java/JS)', 'Payment Gateway Testing'],
    focusCategories: ['API Testing', 'Fintech & Payments', 'SQL', 'Automation Testing'],
    domainTopics: ['Payment Gateways', 'Refund and Void', 'Settlement', 'Payment Failure Scenarios', 'UPI'],
  },
  {
    key: 'phonepe', name: 'PhonePe', segment: 'UPI payments & consumer fintech', website: 'https://www.phonepe.com/careers/',
    overview: 'Bengaluru-headquartered digital payments company best known for its UPI-based consumer payments app, also offering merchant payments and financial services.',
    typicalRoles: ['QA Engineer', 'SDET', 'Performance Test Engineer'], skills: ['API Testing', 'Mobile Testing', 'SQL', 'Automation', 'Performance Testing'],
    focusCategories: ['API Testing', 'Fintech & Payments', 'Performance Testing', 'Automation Testing'],
    domainTopics: ['UPI', 'Transaction Statuses', 'Payment Failure Scenarios', 'Reconciliation'],
  },
  {
    key: 'paytm', name: 'Paytm', segment: 'Payments, merchant devices & financial services', website: 'https://paytm.com/careers/',
    overview: 'Indian digital payments and financial services company (One97 Communications) offering consumer payments, merchant payment devices and financial services.',
    typicalRoles: ['QA Engineer', 'Test Engineer', 'SDET'], skills: ['Manual Testing', 'API Testing', 'SQL', 'POS Transactions', 'Automation'],
    focusCategories: ['Manual Testing', 'API Testing', 'Fintech & Payments', 'SQL'],
    domainTopics: ['POS Transactions', 'UPI', 'Merchant Settlement', 'Refund and Void'],
  },
  {
    key: 'juspay', name: 'Juspay', segment: 'Payment orchestration', website: 'https://juspay.io/careers',
    overview: 'Bengaluru-based payments technology company providing payment orchestration and checkout infrastructure to merchants and banks.',
    typicalRoles: ['QA Engineer', 'SDET'], skills: ['API Testing', 'Automation', 'Payment Gateway Testing', 'SQL'],
    focusCategories: ['API Testing', 'Fintech & Payments', 'Automation Testing'],
    domainTopics: ['Payment Gateways', 'Payment Lifecycle', 'Payment Failure Scenarios', 'UPI'],
  },
  {
    key: 'cred', name: 'CRED', segment: 'Consumer fintech (credit card payments)', website: 'https://careers.cred.club/',
    overview: 'Bengaluru-based consumer fintech platform built around credit card bill payments, rewards and related financial products.',
    typicalRoles: ['SDET', 'QA Engineer'], skills: ['Automation', 'API Testing', 'Mobile Testing', 'SQL'],
    focusCategories: ['Automation Testing', 'API Testing', 'Fintech & Payments'],
    domainTopics: ['Visa and Mastercard', 'Transaction Statuses', 'Refund and Void'],
  },
  {
    key: 'cashfree', name: 'Cashfree Payments', segment: 'Payment gateway & payouts', website: 'https://www.cashfree.com/careers/',
    overview: 'Bengaluru-based payments company offering payment gateway, payouts and related APIs for businesses.',
    typicalRoles: ['QA Engineer', 'SDET', 'API Test Engineer'], skills: ['API Testing', 'Postman', 'SQL', 'Automation'],
    focusCategories: ['API Testing', 'Fintech & Payments', 'SQL'],
    domainTopics: ['Payment Gateways', 'Settlement', 'Reconciliation', 'T+0 T+1 and T+N'],
  },
  {
    key: 'visa', name: 'Visa', segment: 'Card network', website: 'https://corporate.visa.com/en/jobs/',
    overview: 'Global card payments network with technology centres in India, including Bengaluru.',
    typicalRoles: ['Software Test Engineer', 'QA Automation Engineer', 'Performance Engineer'], skills: ['Automation', 'Java', 'API Testing', 'Performance Testing', 'ISO 8583'],
    focusCategories: ['Automation Testing', 'Fintech & Payments', 'Performance Testing'],
    domainTopics: ['ISO 8583 and MTI', 'Authorization', 'Clearing', 'Decline Codes', 'Chargebacks'],
  },
  {
    key: 'mastercard', name: 'Mastercard', segment: 'Card network', website: 'https://careers.mastercard.com/',
    overview: 'Global card payments network with technology hubs in India.',
    typicalRoles: ['Software Engineer in Test', 'QA Engineer', 'Performance Engineer'], skills: ['Automation', 'Java', 'API Testing', 'SQL', 'ISO 8583'],
    focusCategories: ['Automation Testing', 'Fintech & Payments', 'API Testing'],
    domainTopics: ['ISO 8583 and MTI', 'Clearing', 'Settlement', 'Chargebacks', 'Authorization and Clearing Mismatches'],
  },
];

export const TYPICAL_ROUNDS = [
  { name: 'Online assessment / screening', detail: 'Testing fundamentals MCQs, SQL queries, sometimes a short coding or API exercise.' },
  { name: 'Technical round 1 – QA fundamentals', detail: 'Test case design, SDLC/STLC, defect lifecycle, API testing basics, SQL.' },
  { name: 'Technical round 2 – domain / automation', detail: 'Payment domain scenarios, framework design, live automation or API chaining exercise.' },
  { name: 'Hiring manager round', detail: 'Project deep-dive, ownership, prioritisation and stakeholder scenarios.' },
  { name: 'HR round', detail: 'Motivation, notice period, compensation expectations, culture fit.' },
];
