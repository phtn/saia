/**
 * Product catalog: form schemas and indicative rating for every line of business.
 * Field keys follow the legacy QuoteRecord schema in `lib/js/qouteRecordFields.js`
 * so records can be synced back to that entity.
 *
 * Rates here are indicative placeholders so agents get a working estimate;
 * replace them with each insurer's approved tariff before issuing policies.
 */
import { ageFrom, daysBetween, toNumber } from './format'
import { buildBreakdown, emptyBreakdown, LIFE_TAXES, NON_LIFE_TAXES } from './taxes'
import type { FieldDef, FormSection, FormValues, PremiumLine, ProductDefinition, ProductId } from './types'

const str = (values: FormValues, key: string): string => {
  const value = values[key]
  return typeof value === 'string' ? value.trim() : ''
}
const num = (values: FormValues, key: string): number => toNumber(str(values, key).replace(/[₱,\s]/g, ''))
const flag = (values: FormValues, key: string): boolean => values[key] === true

function required(values: FormValues, fields: readonly FieldDef[]): string[] {
  return fields
    .filter((field) => field.required && field.type !== 'boolean' && str(values, field.key) === '')
    .map((field) => `${field.label} is required.`)
}

const allFields = (sections: readonly FormSection[]): FieldDef[] => sections.flatMap((section) => section.fields)

// ---------------------------------------------------------------------------
// Shared client step

export const CLIENT_SECTION: FormSection = {
  id: 'client',
  title: 'Client',
  description: 'Who is being insured and how to reach them.',
  fields: [
    {
      key: 'client_name',
      label: 'Client name',
      type: 'text',
      required: true,
      placeholder: 'Juan Dela Cruz',
      aliases: ['name', 'insured name', 'customer']
    },
    {
      key: 'insured_mobile_number',
      label: 'Mobile number',
      type: 'tel',
      required: true,
      placeholder: '+63 917 000 0000',
      aliases: ['mobile', 'phone', 'phone number', 'cellphone number']
    },
    {
      key: 'insured_email_address',
      label: 'Email address',
      type: 'email',
      placeholder: 'client@email.com',
      aliases: ['email']
    },
    { key: 'insured_birthday', label: 'Birthdate', type: 'date', aliases: ['birthday', 'date of birth'] },
    { key: 'client_address', label: 'Address', type: 'text', wide: true, aliases: ['address', 'home address'] }
  ]
}

export const POLICY_SECTION: FormSection = {
  id: 'policy',
  title: 'Policy',
  description: 'Carrier and period of cover.',
  fields: [
    {
      key: 'insurer_name',
      label: 'Insurer',
      type: 'select',
      options: [
        'Bethel General Insurance',
        'Malayan Insurance',
        'Pioneer Insurance',
        'Standard Insurance',
        'FPG Insurance',
        'Sun Life',
        'AXA Philippines'
      ],
      aliases: ['carrier', 'insurance company']
    },
    {
      key: 'inception_from',
      label: 'Inception from',
      type: 'date',
      required: true,
      aliases: ['start date', 'effective date']
    },
    { key: 'inception_to', label: 'Inception to', type: 'date', required: true, aliases: ['end date', 'expiry date'] }
  ]
}

// ---------------------------------------------------------------------------
// Motor: comprehensive

const motorSections: FormSection[] = [
  {
    id: 'vehicle',
    title: 'Vehicle',
    fields: [
      {
        key: 'vehicle_label',
        label: 'Vehicle',
        type: 'text',
        required: true,
        placeholder: '2024 Toyota Vios 1.3 XLE',
        aliases: ['car', 'make and model']
      },
      { key: 'vehicle_plate', label: 'Plate', type: 'text', placeholder: 'ABC 1234', aliases: ['plate number'] },
      {
        key: 'vehicle_type',
        label: 'Vehicle type',
        type: 'select',
        options: ['Private car', 'SUV / AUV', 'Pick-up', 'Motorcycle', 'Commercial vehicle'],
        required: true
      },
      { key: 'fuel_type', label: 'Fuel type', type: 'select', options: ['Gasoline', 'Diesel', 'Hybrid', 'Electric'] },
      { key: 'engine_no', label: 'Engine no', type: 'text', aliases: ['engine number'] },
      { key: 'chassis_no', label: 'Chassis no', type: 'text', aliases: ['chassis number', 'vin'] },
      {
        key: 'mortgagee',
        label: 'Mortgagee',
        type: 'text',
        hint: 'Bank or financing company, if the vehicle is financed.'
      }
    ]
  },
  {
    id: 'coverage',
    title: 'Coverage',
    fields: [
      {
        key: 'declared_value',
        label: 'Declared value',
        type: 'money',
        required: true,
        min: 100000,
        aliases: ['fair market value', 'value', 'sum insured']
      },
      {
        key: 'vtpl_bi',
        label: 'VTPL bodily injury',
        type: 'select',
        options: ['₱100,000', '₱200,000', '₱300,000', '₱500,000']
      },
      {
        key: 'vtpl_pd',
        label: 'VTPL property damage',
        type: 'select',
        options: ['₱100,000', '₱200,000', '₱300,000', '₱500,000']
      },
      {
        key: 'aon',
        label: 'Acts of Nature',
        type: 'boolean',
        hint: 'Flood, typhoon, earthquake.',
        aliases: ['acts of god', 'flood cover']
      },
      { key: 'auto_pa', label: 'Auto personal accident', type: 'boolean' }
    ]
  }
]

const VTPL_BI: Record<string, number> = { '₱100,000': 590, '₱200,000': 820, '₱300,000': 1040, '₱500,000': 1420 }
const VTPL_PD: Record<string, number> = { '₱100,000': 1180, '₱200,000': 1460, '₱300,000': 1720, '₱500,000': 2150 }
const OD_RATE: Record<string, number> = {
  'Private car': 0.013,
  'SUV / AUV': 0.0135,
  'Pick-up': 0.014,
  Motorcycle: 0.03,
  'Commercial vehicle': 0.018
}

// ---------------------------------------------------------------------------
// Motor: CTPL

const ctplSections: FormSection[] = [
  {
    id: 'vehicle',
    title: 'Vehicle',
    fields: [
      {
        key: 'vehicle_label',
        label: 'Vehicle',
        type: 'text',
        required: true,
        placeholder: '2019 Honda Click 125i',
        aliases: ['car', 'make and model']
      },
      { key: 'vehicle_plate', label: 'Plate', type: 'text', required: true, aliases: ['plate number'] },
      {
        key: 'vehicle_type',
        label: 'Vehicle type',
        type: 'select',
        required: true,
        options: ['Private car', 'Motorcycle / tricycle', 'Light truck', 'Heavy truck', 'Public utility']
      },
      {
        key: 'class_label',
        label: 'Term',
        type: 'select',
        options: ['1 year', '3 years (brand new)'],
        aliases: ['category', 'category term']
      },
      { key: 'mv_file_number', label: 'MV file no', type: 'text', aliases: ['file number'] }
    ]
  }
]

const CTPL_RATES: Record<string, number> = {
  'Private car': 560,
  'Motorcycle / tricycle': 250,
  'Light truck': 610,
  'Heavy truck': 1200,
  'Public utility': 1100
}

// ---------------------------------------------------------------------------
// Mobile (the full workflow lives on the mobile page; this is the record schema)

const mobileSections: FormSection[] = [
  {
    id: 'device',
    title: 'Device',
    fields: [
      {
        key: 'vehicle_label',
        label: 'Device',
        type: 'text',
        required: true,
        aliases: ['phone', 'phone model', 'device model']
      },
      {
        key: 'imei',
        label: 'IMEI',
        type: 'text',
        required: true,
        placeholder: '15 digits',
        aliases: ['imei number', 'serial']
      },
      {
        key: 'declared_value',
        label: 'Insurable value (FMV)',
        type: 'money',
        required: true,
        aliases: ['value', 'fair market value', 'price']
      },
      { key: 'purchase_date', label: 'Purchase date', type: 'date' }
    ]
  }
]

// ---------------------------------------------------------------------------
// Travel

const travelSections: FormSection[] = [
  {
    id: 'trip',
    title: 'Trip',
    fields: [
      {
        key: 'insured_person',
        label: 'Insured person',
        type: 'text',
        required: true,
        aliases: ['traveler', 'traveller']
      },
      {
        key: 'trip_type',
        label: 'Trip type',
        type: 'select',
        options: ['Single trip', 'Annual multi-trip'],
        required: true
      },
      {
        key: 'destination_region',
        label: 'Destination region',
        type: 'select',
        required: true,
        options: ['Domestic', 'Asia', 'Worldwide excl. USA/Canada', 'Worldwide'],
        aliases: ['region']
      },
      {
        key: 'destination',
        label: 'Destination',
        type: 'text',
        placeholder: 'Tokyo, Japan',
        aliases: ['country', 'city']
      },
      {
        key: 'departure_date',
        label: 'Departure date',
        type: 'date',
        required: true,
        aliases: ['departure', 'leaving']
      },
      { key: 'return_date', label: 'Return date', type: 'date', required: true, aliases: ['return'] },
      { key: 'passport_number', label: 'Passport number', type: 'text', aliases: ['passport'] },
      { key: 'flight_number', label: 'Flight number', type: 'text', aliases: ['flight'] },
      { key: 'nationality', label: 'Nationality', type: 'text' },
      { key: 'plan', label: 'Plan', type: 'select', options: ['Essential', 'Plus', 'Elite'] }
    ]
  }
]

const TRAVEL_DAILY: Record<string, number> = {
  Domestic: 25,
  Asia: 60,
  'Worldwide excl. USA/Canada': 90,
  Worldwide: 120
}
const TRAVEL_PLAN: Record<string, number> = { Essential: 1, Plus: 1.35, Elite: 1.8 }

// ---------------------------------------------------------------------------
// Personal accident

const paSections: FormSection[] = [
  {
    id: 'insured',
    title: 'Insured',
    fields: [
      { key: 'insured_person', label: 'Insured person', type: 'text', required: true },
      { key: 'occupation', label: 'Occupation', type: 'text', placeholder: 'Office worker', aliases: ['job', 'work'] },
      {
        key: 'occupation_class',
        label: 'Occupation class',
        type: 'select',
        required: true,
        options: ['Class 1 — office / professional', 'Class 2 — light manual', 'Class 3 — heavy manual'],
        aliases: ['risk class']
      },
      {
        key: 'sum_assured',
        label: 'Sum assured',
        type: 'money',
        required: true,
        min: 50000,
        aliases: ['coverage amount', 'sum insured']
      },
      {
        key: 'medical_reimbursement',
        label: 'Medical reimbursement',
        type: 'boolean',
        hint: 'Adds 10% of sum assured for accident medical costs.'
      },
      { key: 'beneficiary', label: 'Beneficiary', type: 'text', wide: true, aliases: ['beneficiaries'] }
    ]
  }
]

const PA_RATE = [0.0015, 0.0025, 0.004]

// ---------------------------------------------------------------------------
// Commercial (property / business package)

const commercialSections: FormSection[] = [
  {
    id: 'business',
    title: 'Business',
    fields: [
      {
        key: 'business_name',
        label: 'Business name',
        type: 'text',
        required: true,
        aliases: ['company', 'company name']
      },
      { key: 'tin', label: 'TIN', type: 'text', aliases: ['tax number'] },
      {
        key: 'occupancy',
        label: 'Occupancy',
        type: 'select',
        required: true,
        options: ['Office', 'Retail / restaurant', 'Warehouse', 'Manufacturing'],
        aliases: ['business type', 'use']
      },
      {
        key: 'construction_class',
        label: 'Construction class',
        type: 'select',
        required: true,
        options: ['Class A — concrete', 'Class B — mixed', 'Class C — light materials'],
        aliases: ['construction']
      },
      {
        key: 'client_address',
        label: 'Risk address',
        type: 'text',
        wide: true,
        required: true,
        aliases: ['location', 'property address']
      }
    ]
  },
  {
    id: 'sums',
    title: 'Sums insured',
    fields: [
      { key: 'building_value', label: 'Building', type: 'money', aliases: ['building value'] },
      { key: 'contents_value', label: 'Contents & stock', type: 'money', aliases: ['contents', 'stock'] },
      {
        key: 'business_interruption',
        label: 'Business interruption',
        type: 'boolean',
        hint: 'Loss of gross profit after an insured event.'
      },
      {
        key: 'cgl_limit',
        label: 'General liability limit',
        type: 'select',
        options: ['None', '₱1,000,000', '₱3,000,000', '₱5,000,000'],
        aliases: ['liability']
      }
    ]
  }
]

const COMMERCIAL_OCCUPANCY: Record<string, number> = {
  Office: 0.002,
  'Retail / restaurant': 0.003,
  Warehouse: 0.0045,
  Manufacturing: 0.006
}
const COMMERCIAL_CONSTRUCTION = [1, 1.25, 1.6]
const CGL: Record<string, number> = { None: 0, '₱1,000,000': 4500, '₱3,000,000': 9800, '₱5,000,000': 14200 }

// ---------------------------------------------------------------------------
// Pet

const petSections: FormSection[] = [
  {
    id: 'pet',
    title: 'Pet',
    fields: [
      { key: 'pet_name', label: 'Pet name', type: 'text', required: true, aliases: ['name of pet'] },
      { key: 'species', label: 'Species', type: 'select', required: true, options: ['Dog', 'Cat'] },
      { key: 'breed', label: 'Breed', type: 'text', placeholder: 'Aspin, Shih Tzu, Persian…' },
      { key: 'pet_age', label: 'Age (years)', type: 'number', required: true, min: 0, max: 20, aliases: ['age'] },
      { key: 'microchip', label: 'Microchip no', type: 'text', aliases: ['chip'] },
      { key: 'plan', label: 'Plan', type: 'select', required: true, options: ['Basic', 'Standard', 'Premium'] },
      {
        key: 'pre_existing',
        label: 'Pre-existing conditions',
        type: 'textarea',
        wide: true,
        hint: 'Excluded from cover; list them for underwriting.'
      }
    ]
  }
]

const PET_BASE: Record<string, number> = { Dog: 4500, Cat: 3200 }
const PET_PLAN: Record<string, number> = { Basic: 1, Standard: 1.4, Premium: 2 }

// ---------------------------------------------------------------------------
// Life (term)

const lifeSections: FormSection[] = [
  {
    id: 'insured',
    title: 'Life insured',
    fields: [
      { key: 'insured_person', label: 'Insured person', type: 'text', required: true },
      {
        key: 'insured_birthday',
        label: 'Birthdate',
        type: 'date',
        required: true,
        aliases: ['birthday', 'date of birth']
      },
      { key: 'gender', label: 'Sex', type: 'select', options: ['Female', 'Male'], aliases: ['gender'] },
      { key: 'smoker', label: 'Smoker', type: 'boolean', aliases: ['smokes'] },
      {
        key: 'sum_assured',
        label: 'Sum assured',
        type: 'money',
        required: true,
        min: 100000,
        aliases: ['face amount', 'coverage amount']
      },
      {
        key: 'term_years',
        label: 'Term',
        type: 'select',
        required: true,
        options: ['5 years', '10 years', '15 years', '20 years'],
        aliases: ['term']
      },
      { key: 'beneficiary', label: 'Beneficiary', type: 'text', wide: true, aliases: ['beneficiaries'] }
    ]
  }
]

/** Annual rate per ₱1,000 of sum assured by attained age. */
function lifeRatePerThousand(age: number): number {
  if (age < 30) return 1.1
  if (age < 40) return 1.6
  if (age < 50) return 3.2
  if (age < 60) return 7.4
  return 15.8
}

// ---------------------------------------------------------------------------
// Home

const homeSections: FormSection[] = [
  {
    id: 'property',
    title: 'Property',
    fields: [
      {
        key: 'vehicle_label',
        label: 'Property',
        type: 'text',
        required: true,
        placeholder: '2-storey house',
        aliases: ['property type', 'house']
      },
      {
        key: 'client_address',
        label: 'Property address',
        type: 'text',
        wide: true,
        required: true,
        aliases: ['location']
      },
      { key: 'declared_value', label: 'Building value', type: 'money', required: true, aliases: ['value', 'building'] },
      { key: 'sum_assured', label: 'Contents value', type: 'money', aliases: ['contents'] },
      { key: 'flood_zone', label: 'Flood-prone area', type: 'boolean' }
    ]
  }
]

// ---------------------------------------------------------------------------

export const PRODUCTS: Record<ProductId, ProductDefinition> = {
  motor: {
    id: 'motor',
    label: 'Car Comprehensive',
    legacyType: 'Car Comprehensive',
    icon: 'car',
    tagline: 'Own damage, theft, third-party liability',
    sections: motorSections,
    defaults: {
      vehicle_type: 'Private car',
      fuel_type: 'Gasoline',
      vtpl_bi: '₱200,000',
      vtpl_pd: '₱200,000',
      aon: false,
      auto_pa: true
    },
    describeRisk: (values) => str(values, 'vehicle_label') || 'Vehicle',
    rate(values) {
      const issues = required(values, allFields(motorSections))
      const value = num(values, 'declared_value')
      if (value > 0 && value < 100000) issues.push('Declared value must be at least ₱100,000.')
      const lines: PremiumLine[] = [
        {
          label: 'Own damage & theft',
          amount: value * (OD_RATE[str(values, 'vehicle_type')] ?? 0.013),
          note: 'of declared value'
        },
        { label: 'VTPL bodily injury', amount: VTPL_BI[str(values, 'vtpl_bi')] ?? 0 },
        { label: 'VTPL property damage', amount: VTPL_PD[str(values, 'vtpl_pd')] ?? 0 }
      ]
      if (flag(values, 'aon')) lines.push({ label: 'Acts of Nature', amount: value * 0.005, note: '0.5%' })
      if (flag(values, 'auto_pa')) lines.push({ label: 'Auto personal accident', amount: 300 })
      return buildBreakdown(lines, NON_LIFE_TAXES, issues)
    }
  },
  ctpl: {
    id: 'ctpl',
    label: 'Car CTPL',
    legacyType: 'Car CTPL',
    icon: 'shield',
    tagline: 'Compulsory third-party liability for LTO registration',
    sections: ctplSections,
    defaults: { vehicle_type: 'Private car', class_label: '1 year' },
    describeRisk: (values) =>
      [str(values, 'vehicle_label'), str(values, 'vehicle_plate')].filter(Boolean).join(' · ') || 'Vehicle',
    rate(values) {
      const issues = required(values, allFields(ctplSections))
      const years = str(values, 'class_label').startsWith('3') ? 3 : 1
      const base = CTPL_RATES[str(values, 'vehicle_type')] ?? 560
      return buildBreakdown(
        [{ label: `CTPL basic premium × ${years} yr`, amount: base * years }],
        NON_LIFE_TAXES,
        issues
      )
    }
  },
  mobile: {
    id: 'mobile',
    label: 'Cellphone',
    legacyType: 'Cellphone',
    icon: 'smartphone',
    tagline: 'Accidental damage, theft and warranty for phones',
    sections: mobileSections,
    defaults: {},
    describeRisk: (values) => str(values, 'vehicle_label') || 'Device',
    // The mobile page rates with the coverage engine; this fallback applies all effective coverages.
    rate: () => emptyBreakdown(['Rate mobile quotes on the Mobile page.'])
  },
  travel: {
    id: 'travel',
    label: 'Travel Insurance',
    legacyType: 'Travel Insurance',
    icon: 'travel',
    tagline: 'Medical, trip cancellation and baggage abroad',
    sections: travelSections,
    defaults: { trip_type: 'Single trip', destination_region: 'Asia', plan: 'Plus', nationality: 'Filipino' },
    describeRisk: (values) => str(values, 'destination') || str(values, 'destination_region') || 'Trip',
    rate(values) {
      const issues = required(values, allFields(travelSections))
      const plan = TRAVEL_PLAN[str(values, 'plan')] ?? 1
      const daily = TRAVEL_DAILY[str(values, 'destination_region')] ?? 60
      const age = ageFrom(str(values, 'insured_birthday'))
      const ageFactor = age !== null && age >= 65 ? 1.5 : 1
      if (str(values, 'trip_type') === 'Annual multi-trip') {
        return buildBreakdown(
          [{ label: 'Annual multi-trip', amount: daily * 60 * plan * ageFactor, note: 'up to 90 days per trip' }],
          NON_LIFE_TAXES,
          issues
        )
      }
      const days = daysBetween(str(values, 'departure_date'), str(values, 'return_date')) + 1
      if (str(values, 'departure_date') && str(values, 'return_date') && days < 1)
        issues.push('Return date must be on or after departure.')
      const lines: PremiumLine[] = [
        {
          label: `${Math.max(days, 0)} day(s) × ₱${daily}/day`,
          amount: Math.max(300, Math.max(days, 0) * daily * plan)
        }
      ]
      if (ageFactor > 1) lines.push({ label: 'Senior loading (65+)', amount: lines[0].amount * 0.5 })
      return buildBreakdown(lines, NON_LIFE_TAXES, issues)
    }
  },
  'personal-accident': {
    id: 'personal-accident',
    label: 'Personal Accident',
    legacyType: 'Personal Accident',
    icon: 'pa',
    tagline: 'Accidental death, disablement and medical',
    sections: paSections,
    defaults: {
      occupation_class: 'Class 1 — office / professional',
      sum_assured: '500000',
      medical_reimbursement: true
    },
    describeRisk: (values) => str(values, 'insured_person') || 'Insured',
    rate(values) {
      const issues = required(values, allFields(paSections))
      const sum = num(values, 'sum_assured')
      const cls = Number(str(values, 'occupation_class').match(/Class (\d)/)?.[1] ?? 1) - 1
      const lines: PremiumLine[] = [
        { label: 'Accidental death & disablement', amount: sum * (PA_RATE[cls] ?? PA_RATE[0]) }
      ]
      if (flag(values, 'medical_reimbursement'))
        lines.push({ label: 'Medical reimbursement', amount: sum * 0.1 * 0.01 })
      return buildBreakdown(lines, NON_LIFE_TAXES, issues)
    }
  },
  commercial: {
    id: 'commercial',
    label: 'Commercial',
    legacyType: 'Commercial',
    icon: 'commercial',
    tagline: 'Fire & allied perils, business interruption, liability',
    sections: commercialSections,
    defaults: {
      occupancy: 'Office',
      construction_class: 'Class A — concrete',
      cgl_limit: 'None',
      business_interruption: false
    },
    describeRisk: (values) => str(values, 'business_name') || 'Business',
    rate(values) {
      const issues = required(values, allFields(commercialSections))
      const property = num(values, 'building_value') + num(values, 'contents_value')
      if (property === 0) issues.push('Enter a building or contents sum insured.')
      const cls =
        Number(
          str(values, 'construction_class')
            .match(/Class ([ABC])/)?.[1]
            ?.charCodeAt(0) ?? 65
        ) - 65
      const fire =
        property * (COMMERCIAL_OCCUPANCY[str(values, 'occupancy')] ?? 0.002) * (COMMERCIAL_CONSTRUCTION[cls] ?? 1)
      const lines: PremiumLine[] = [{ label: 'Fire & allied perils', amount: fire }]
      if (flag(values, 'business_interruption'))
        lines.push({ label: 'Business interruption', amount: fire * 0.2, note: '20% loading' })
      const cgl = CGL[str(values, 'cgl_limit')] ?? 0
      if (cgl > 0) lines.push({ label: 'Comprehensive general liability', amount: cgl })
      return buildBreakdown(lines, NON_LIFE_TAXES, issues)
    }
  },
  pet: {
    id: 'pet',
    label: 'Pet',
    legacyType: 'Pet',
    icon: 'pet',
    tagline: 'Vet bills for illness and accidents',
    sections: petSections,
    defaults: { species: 'Dog', plan: 'Standard' },
    describeRisk: (values) => [str(values, 'pet_name'), str(values, 'species')].filter(Boolean).join(' · ') || 'Pet',
    rate(values) {
      const issues = required(values, allFields(petSections))
      const age = num(values, 'pet_age')
      if (age > 10) issues.push('Pets older than 10 need underwriter referral.')
      const base = (PET_BASE[str(values, 'species')] ?? 4500) * (PET_PLAN[str(values, 'plan')] ?? 1)
      const lines: PremiumLine[] = [{ label: `${str(values, 'plan') || 'Basic'} plan`, amount: base }]
      if (age >= 7) lines.push({ label: 'Senior pet loading', amount: base * 0.5 })
      return buildBreakdown(lines, NON_LIFE_TAXES, issues)
    }
  },
  life: {
    id: 'life',
    label: 'Term Life',
    legacyType: 'Term Life',
    icon: 'heart',
    tagline: 'Level term life protection',
    sections: lifeSections,
    defaults: { gender: 'Female', smoker: false, term_years: '10 years', sum_assured: '1000000' },
    describeRisk: (values) => str(values, 'insured_person') || 'Life insured',
    rate(values) {
      const issues = required(values, allFields(lifeSections))
      const age = ageFrom(str(values, 'insured_birthday'))
      if (age !== null && (age < 18 || age > 65)) issues.push('Issue age must be 18 to 65.')
      const sum = num(values, 'sum_assured')
      const term = Number(str(values, 'term_years').match(/\d+/)?.[0] ?? 10)
      const base = (sum / 1000) * lifeRatePerThousand(age ?? 30) * (1 + (term - 5) * 0.02)
      const lines: PremiumLine[] = [{ label: `Annual premium, ${term}-year term`, amount: base }]
      if (flag(values, 'smoker')) lines.push({ label: 'Smoker loading', amount: base * 0.6 })
      if (str(values, 'gender') === 'Female') lines.push({ label: 'Female rate discount', amount: -base * 0.1 })
      return buildBreakdown(lines, LIFE_TAXES, issues)
    }
  },
  home: {
    id: 'home',
    label: 'Home',
    legacyType: 'Home',
    icon: 'home',
    tagline: 'Fire, typhoon and flood for homes and contents',
    sections: homeSections,
    defaults: { flood_zone: false },
    describeRisk: (values) => str(values, 'vehicle_label') || 'Property',
    rate(values) {
      const issues = required(values, allFields(homeSections))
      const building = num(values, 'declared_value')
      const contents = num(values, 'sum_assured')
      const lines: PremiumLine[] = [{ label: 'Fire & lightning', amount: (building + contents) * 0.0018 }]
      lines.push({
        label: 'Typhoon & flood',
        amount: (building + contents) * (flag(values, 'flood_zone') ? 0.0025 : 0.0012)
      })
      return buildBreakdown(lines, NON_LIFE_TAXES, issues)
    }
  }
}

export const PRODUCT_LIST: ProductDefinition[] = Object.values(PRODUCTS)

export function isProductId(value: string): value is ProductId {
  return Object.prototype.hasOwnProperty.call(PRODUCTS, value)
}

/** Maps a free-text or legacy product name to a product, from `usePolicyHolders.js`. */
export function productFromLabel(label: string | null | undefined): ProductId | null {
  const text = String(label ?? '').toLowerCase()
  if (text.includes('ctpl')) return 'ctpl'
  if (text.includes('comprehensive') || text === 'car' || text.includes('motor') || text.includes('auto'))
    return 'motor'
  if (text.includes('device') || text.includes('cellphone') || text.includes('phone') || text.includes('mobile'))
    return 'mobile'
  if (text.includes('life')) return 'life'
  if (text.includes('travel')) return 'travel'
  if (text.includes('accident')) return 'personal-accident'
  if (text.includes('commercial') || text.includes('business') || text.includes('fire')) return 'commercial'
  if (text.includes('pet') || text.includes('dog') || text.includes('cat')) return 'pet'
  if (text.includes('home') || text.includes('house')) return 'home'
  return null
}

/** Every field a product's quote form collects, in order. */
export function productFields(product: ProductDefinition): FieldDef[] {
  return [...CLIENT_SECTION.fields, ...allFields(product.sections), ...POLICY_SECTION.fields]
}
