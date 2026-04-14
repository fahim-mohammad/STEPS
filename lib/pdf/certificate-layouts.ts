export type CertificateTemplateKey =
  | 'FOUNDER_LEADERSHIP'
  | 'ADMIN_LEADERSHIP'
  | 'TECHNICAL_CONTRIBUTION'
  | 'FINANCIAL_CONTRIBUTION'
  | 'COMMUNITY_SERVICE'
  | 'SPECIAL_RECOGNITION'

export type RGB = readonly [number, number, number]

export type CertificateLayout = {
  roleY: number
  roleSize: number
  roleColor: RGB
  roleFont: 'helvetica' | 'times'
  roleStyle: 'bold' | 'italic' | 'bolditalic' | 'normal'
  roleMaxWidth: number

  nameY: number
  nameSize: number
  nameColor: RGB
  nameFont: 'helvetica' | 'times'
  nameStyle: 'bold' | 'italic' | 'bolditalic' | 'normal'
  nameMaxWidth: number

  messageLineY: number
  bodyY: number
  bodySize: number
  bodyColor: RGB
  bodyMaxWidth: number
  bodyLineHeight: number

  certificateIdX: number
  certificateIdY: number
  certificateIdSize: number
  certificateIdColor: RGB
  certificateIdMaxWidth: number

  dateCenterX: number
  dateY: number
  dateSize: number
  dateColor: RGB
  dateMaxWidth: number

  signatureX: number
  signatureY: number
  signatureW: number
  signatureH: number

  qrX: number
  qrY: number
  qrSize: number
  qrLabelY: number

  verifyNoteY: number
  verifyNoteColor: RGB
  verifyNoteSize: number
}

const DARK_GOLD: RGB = [233, 206, 158]
const DARK_TEXT: RGB = [248, 248, 248]
const DARK_SOFT: RGB = [236, 231, 220]

const LIGHT_GOLD: RGB = [166, 122, 52]
const LIGHT_TEXT: RGB = [64, 51, 34]
const LIGHT_SOFT: RGB = [96, 80, 54]

export const CERTIFICATE_LAYOUTS: Record<CertificateTemplateKey, CertificateLayout> = {
  FOUNDER_LEADERSHIP: {
    roleY: 300,
    roleSize: 30,
    roleColor: DARK_GOLD,
    roleFont: 'helvetica',
    roleStyle: 'bold',
    roleMaxWidth: 30,

    nameY: 340,
    nameSize: 30,
    nameColor: DARK_TEXT,
    nameFont: 'helvetica',
    nameStyle: 'bold',
    nameMaxWidth: 450,

    messageLineY: 350,
    bodyY: 370,
    bodySize: 15,
    bodyColor: DARK_SOFT,
    bodyMaxWidth: 500,
    bodyLineHeight: 18,

    certificateIdX: 100,
    certificateIdY: 545,
    certificateIdSize: 8.5,
    certificateIdColor: DARK_SOFT,
    certificateIdMaxWidth: 150,

    dateCenterX: 160,
    dateY: 510,
    dateSize: 15,
    dateColor: DARK_TEXT,
    dateMaxWidth: 110,

    signatureX: 650,
    signatureY: 475,
    signatureW: 100,
    signatureH: 50,

    qrX: 748,
    qrY: 490,
    qrSize: 50,
    qrLabelY: 550,

    verifyNoteY: 548,
    verifyNoteColor: DARK_SOFT,
    verifyNoteSize: 8,
  },

ADMIN_LEADERSHIP: {
  roleY: 300,
  roleSize: 16,
  roleColor: [232, 205, 149],
  roleFont: 'helvetica',
  roleStyle: 'bold',
  roleMaxWidth: 400,

  nameY: 340,
  nameSize: 28,
  nameColor: [245, 245, 245],
  nameFont: 'helvetica',
  nameStyle: 'bold',
  nameMaxWidth: 520,

  messageLineY: 0,
  bodyY: 400,
  bodySize: 16,
  bodyColor: [240, 240, 240],
  bodyMaxWidth: 500,
  bodyLineHeight: 18,

  certificateIdX: 255,
  certificateIdY: 490,
  certificateIdSize: 8.5,
  certificateIdColor: [240, 240, 240],
  certificateIdMaxWidth: 180,

  dateCenterX: 540,
  dateY: 514,
  dateSize: 16,
  dateColor: [245, 245, 245],
  dateMaxWidth: 130,

  signatureX: 690,
  signatureY: 480,
  signatureW: 100,
  signatureH: 50,

  qrX: 260,
  qrY: 500,
  qrSize: 44,
  qrLabelY: 550,

  verifyNoteY: 560,
  verifyNoteColor: [220, 220, 220],
  verifyNoteSize: 7.5,
},

 TECHNICAL_CONTRIBUTION: {
  roleY: 340,                 
  roleSize: 18,             
  roleColor: [220, 175, 80],
  roleFont: 'helvetica',
  roleStyle: 'bold',
  roleMaxWidth: 360,          

  nameY: 380,                 
  nameSize: 25,               
  nameColor: [245, 245, 245],
  nameFont: 'helvetica',
  nameStyle: 'bold',
  nameMaxWidth: 450,          

  messageLineY: 342,          

  bodyY: 420,                 
  bodySize: 20,               
  bodyColor: [238, 238, 238],
  bodyMaxWidth: 400,         
  bodyLineHeight: 15,         

  certificateIdX: 150,        
  certificateIdY: 580,        
  certificateIdSize: 7.5,     
  certificateIdColor: [240, 240, 240],
  certificateIdMaxWidth: 120, 

  dateCenterX: 255,           
  dateY: 525,
  dateSize: 14,               
  dateColor: [245, 245, 245],
  dateMaxWidth: 100,          

  signatureX: 560,        
  signatureY: 490,
  signatureW: 100,            
  signatureH: 50,             

  qrX: 650,
  qrY: 510,
  qrSize: 58,
  qrLabelY: 580,

  verifyNoteY: 580,
  verifyNoteColor: [220, 220, 220],
  verifyNoteSize: 7.5,
},

  FINANCIAL_CONTRIBUTION: {
    roleY: 310,
    roleSize: 20,
    roleColor: LIGHT_GOLD,
    roleFont: 'helvetica',
    roleStyle: 'bold',
    roleMaxWidth: 400,

    nameY: 350,
    nameSize: 35,
    nameColor: LIGHT_TEXT,
    nameFont: 'times',
    nameStyle: 'bolditalic',
    nameMaxWidth: 400,

    messageLineY: 344,
    bodyY: 385,
    bodySize: 20,
    bodyColor: [70, 60, 50],
    bodyMaxWidth: 360,
    bodyLineHeight: 18,

    certificateIdX: 130,
    certificateIdY: 560,
    certificateIdSize: 8.5,
    certificateIdColor: LIGHT_SOFT,
    certificateIdMaxWidth: 150,

    dateCenterX: 345,
    dateY: 510,
    dateSize: 15,
    dateColor: LIGHT_TEXT,
    dateMaxWidth: 110,

    signatureX: 665,
    signatureY: 470,
    signatureW: 100,
    signatureH: 50,

    qrX: 190,
    qrY: 490,
    qrSize: 58,
    qrLabelY: 50,

    verifyNoteY: 550,
    verifyNoteColor: LIGHT_SOFT,
    verifyNoteSize: 8,
  },

  COMMUNITY_SERVICE: {
    roleY: 310,
    roleSize: 20,
    roleColor: LIGHT_GOLD,
    roleFont: 'helvetica',
    roleStyle: 'bold',
    roleMaxWidth: 400,

    nameY: 350,
    nameSize: 35,
    nameColor: LIGHT_TEXT,
    nameFont: 'times',
    nameStyle: 'bolditalic',
    nameMaxWidth: 400,

    messageLineY: 344,
    bodyY: 385,
    bodySize: 20,
    bodyColor: [70, 60, 50],
    bodyMaxWidth: 360,
    bodyLineHeight: 18,

    certificateIdX: 130,
    certificateIdY: 560,
    certificateIdSize: 8.5,
    certificateIdColor: LIGHT_SOFT,
    certificateIdMaxWidth: 150,

    dateCenterX: 345,
    dateY: 510,
    dateSize: 15,
    dateColor: LIGHT_TEXT,
    dateMaxWidth: 110,

    signatureX: 665,
    signatureY: 470,
    signatureW: 100,
    signatureH: 50,

    qrX: 190,
    qrY: 490,
    qrSize: 58,
    qrLabelY: 50,

    verifyNoteY: 550,
    verifyNoteColor: LIGHT_SOFT,
    verifyNoteSize: 8,
  },

  SPECIAL_RECOGNITION: {
    roleY: 310,
    roleSize: 20,
    roleColor: LIGHT_GOLD,
    roleFont: 'helvetica',
    roleStyle: 'bold',
    roleMaxWidth: 400,

    nameY: 350,
    nameSize: 35,
    nameColor: LIGHT_TEXT,
    nameFont: 'times',
    nameStyle: 'bolditalic',
    nameMaxWidth: 400,

    messageLineY: 344,
    bodyY: 385,
    bodySize: 20,
    bodyColor: [70, 60, 50],
    bodyMaxWidth: 360,
    bodyLineHeight: 19,

    certificateIdX: 130,
    certificateIdY: 560,
    certificateIdSize: 8.5,
    certificateIdColor: LIGHT_SOFT,
    certificateIdMaxWidth: 150,

    dateCenterX: 345,
    dateY: 510,
    dateSize: 15,
    dateColor: LIGHT_TEXT,
    dateMaxWidth: 110,

    signatureX: 665,
    signatureY: 470,
    signatureW: 100,
    signatureH: 50,

    qrX: 190,
    qrY: 490,
    qrSize: 58,
    qrLabelY: 50,

    verifyNoteY: 550,
    verifyNoteColor: LIGHT_SOFT,
    verifyNoteSize: 8,
  },
}