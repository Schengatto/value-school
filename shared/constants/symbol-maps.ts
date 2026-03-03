/**
 * Symbol mappings between DB/OTC symbols and provider-specific symbols.
 * Ported from legacy src-legacy/symbols/yahoo-to-finnhub.js
 *
 * The DB stores Finnhub/OTC symbols (e.g., NPKYF).
 * Yahoo Finance uses exchange-specific symbols (e.g., 4272.T for Tokyo).
 * Polygon uses US-listed symbols when available.
 */

// DB/OTC symbol → Yahoo Finance symbol
export const YAHOO_SYMBOL_MAP: Record<string, string> = {
  // Taiwan
  'TSMWF': 'TSM',

  // Germany (.DE)
  'RNMBF': 'RHM.DE',
  'SAPGF': 'SAP.DE',
  'SMEGF': 'ENR.DE',
  'BAYRY': 'BAYN.DE',
  'SIEGY': 'SIE.DE',
  'BAMXF': 'BMW.DE',
  'ALIZY': 'ALV.DE',
  'IFNNF': 'IFX.DE',
  'VLKAF': 'VOW.DE',
  'POAHY': 'PAH3.DE',
  'DTEGY': 'DTE.DE',
  'MURGY': 'MUV2.DE',
  'ADDDF': 'ADS.DE',
  'BFFAF': 'BAS.DE',
  'DTGHF': 'DTG.DE',
  'TYEKF': 'TKA.DE',
  'HNSDF': 'HAG.DE',
  'TLGHY': '1U1.DE',

  // Netherlands (.AS)
  'ASMLF': 'ASML.AS',
  'UMGNF': 'UMG.AS',
  'ASMXF': 'ASM.AS',

  // France (.PA)
  'AXAHF': 'CS.PA',
  'TTFNF': 'TTE.PA',
  'TLPFY': 'TEP.PA',
  'WNDLF': 'MF.PA',
  'ATRRF': 'ALTA.PA',

  // Denmark (.CO)
  'NVO': 'NOVO-B.CO',

  // Hong Kong (.HK)
  'BYDDY': '1211.HK',
  'XIACY': '1810.HK',
  'XNGSF': '2688.HK',
  'SJMHF': '0880.HK',
  'HHUSF': '1347.HK',
  'BSDGY': '3998.HK',
  'HTHT': '1179.HK',
  'CPCAY': '0293.HK',
  'CCCGY': '1800.HK',
  'CHWRF': '0788.HK',
  'VDAHY': '3331.HK',
  'BOYAF': '0434.HK',
  'MOGLF': '0975.HK',
  'ASCLF': '1672.HK',
  'SOLLF': '0272.HK',

  // Japan (.T)
  'MJHLY': '2269.T',
  'DINRF': '7735.T',
  'DENKF': '4061.T',
  'DNZOF': '6902.T',
  'JAIRF': '9706.T',
  'WJRYF': '9021.T',
  'STBFY': '2587.T',
  'TKCBF': '5301.T',
  'NPKYF': '4272.T',
  'NCRBF': '5302.T',
  'ORXCF': '8591.T',
  'OPHLF': '4528.T',
  'NGSCF': '8012.T',

  // Singapore (.SI)
  'SGGKY': 'S63.SI',
  'YSHLF': 'BS6.SI',

  // Norway (.OL)
  'AKRBF': 'AKRBP.OL',
  'AUTSF': 'AUTO.OL',
  'WILYY': 'WWI.OL',
  'NLLSF': 'NEL.OL',
  'ABGSF': 'ABG.OL',
  'STSCY': 'SATS.OL',

  // Sweden (.ST)
  'EVGGF': 'EVO.ST',
  'DTCGF': 'DOM.ST',
  'AFXXF': 'AFRY.ST',
  'BRCTF': 'BIOA-B.ST',
  'HMBAF': 'HUMBLE.ST',
  'ACASF': 'ACAST.ST',
  'NCABF': 'NCAB.ST',
  'VSTKF': 'VNV.ST',

  // Spain (.MC)
  'BKNIY': 'BKT.MC',
  'BNDSF': 'SAB.MC',

  // UK (.L)
  'RBGPF': 'RKT.L',
  'AAFRF': 'AAF.L',
  'BZLYF': 'BEZ.L',
  'DRXGF': 'DRX.L',
  'DNEMF': 'DNLM.L',
  'ATDRF': 'AUTO.L',
  'LIECF': '0842.HK',

  // Switzerland (.SW)
  'DAWIF': 'DAE.SW',
  'CLZNY': 'CLN.SW',
  'DESNF': 'DOKA.SW',
  'BQCNF': 'BCVN.SW',
  'BCHHF': 'BCHN.SW',
  'BRRLF': 'BARN.SW',

  // Australia (.AX)
  'CAHPF': 'EVN.AX',
  'WFAFF': 'WES.AX',
  'CARZF': 'CAR.AX',
  'BXRBF': 'BEN.AX',

  // Canada (.TO)
  'WNGRF': 'WN.TO',
  'BRLXF': 'BLX.TO',

  // Italy (.MI)
  'FCCMF': 'FCT.MI',
  'PLLIF': 'PIRC.MI',
  'IFSUF': 'INW.MI',

  // Finland (.HE)
  'VOYJF': 'VALMT.HE',

  // Austria (.VI)
  'OMVJF': 'OMV.VI',

  // South Africa (.JO)
  'DRDGF': 'DRD.JO',
  'WLWHF': 'WHL.JO',

  // Mexico (.MX)
  'BOMXF': 'BOLSAA.MX',

  // New Zealand (.NZ)
  'SMGRF': 'SUM.NZ',

  // Indonesia (.JK)
  'PTIZF': 'ITMG.JK',

  // Thailand (.BK)
  'IRPSY': 'IRPC.BK',

  // China (.SZ)
  'TQLCF': '002466.SZ',

  // Poland (.WA)
  'KRKKF': 'KRU.WA',

  // Weibo
  'WEIBF': 'WB'
}

// DB/OTC symbol → Polygon symbol (only where different from DB symbol)
export const POLYGON_SYMBOL_MAP: Record<string, string> = {
  'TSMWF': 'TSM'
}

/**
 * Get the Yahoo Finance symbol for a given DB/OTC symbol.
 */
export function getYahooSymbol(symbol: string): string {
  return YAHOO_SYMBOL_MAP[symbol] ?? symbol
}

/**
 * Get the Polygon symbol for a given DB/OTC symbol.
 */
export function getPolygonSymbol(symbol: string): string {
  return POLYGON_SYMBOL_MAP[symbol] ?? symbol
}
