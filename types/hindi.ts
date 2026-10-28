// Hindi/Hinglish translations for Indian users

export const ISSUE_CATEGORIES_HINDI = {
  pothole: "गड्ढे / Gadde",
  water: "पानी की समस्या / Paani",
  power: "बिजली / Bijli",
  garbage: "कचरा / Kachra",
  streetlight: "स्ट्रीट लाइट / Street Light",
  drainage: "नाली / Drainage",
  road: "सड़क / Sadak",
  other: "अन्य / Other",
} as const;

export const ISSUE_STATUS_HINDI = {
  reported: "शिकायत दर्ज / Reported",
  acknowledged: "स्वीकार किया / Accepted",
  in_progress: "काम चल रहा है / Work in Progress",
  resolved: "हल हो गया / Resolved",
} as const;

export const COMMON_PHRASES = {
  // Actions
  report_issue: "शिकायत दर्ज करें",
  view_issues: "समस्याएं देखें",
  upvote: "मुझे भी",
  submit: "भेजें",
  cancel: "रद्द करें",
  
  // Status
  loading: "लोड हो रहा है...",
  success: "सफल!",
  error: "त्रुटि!",
  
  // Form fields
  title: "शीर्षक",
  description: "विवरण",
  category: "श्रेणी",
  location: "स्थान",
  photo: "फोटो",
  
  // Messages
  location_detected: "स्थान मिल गया",
  location_failed: "स्थान नहीं मिला, डिफ़ॉल्ट का उपयोग करें",
  issue_created: "शिकायत दर्ज हो गई!",
  issue_failed: "शिकायत दर्ज नहीं हो सकी",
} as const;
