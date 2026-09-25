/** Sample book of business so the dashboard is useful before a backend is connected. */
import { addDays, addMonths, isoDate } from './format'
import { PRODUCTS } from './products'
import type { ClaimRecord, FormValues, PolicyStatus, ProductId, QuoteRecord, ReminderTask } from './types'

interface SeedQuote {
  product: ProductId
  name: string
  status: PolicyStatus
  daysAgo: number
  values: FormValues
}

const SEEDS: SeedQuote[] = [
  { product: 'motor', name: 'Andrea Villanueva', status: 'Active', daysAgo: 3, values: { vehicle_label: '2024 Toyota Vios 1.3 XLE', vehicle_plate: 'NAB 4821', vehicle_type: 'Private car', declared_value: '865000', vtpl_bi: '₱200,000', vtpl_pd: '₱200,000', aon: true, auto_pa: true } },
  { product: 'mobile', name: 'Marco Reyes', status: 'Pending', daysAgo: 1, values: { vehicle_label: 'Apple iPhone 16 Pro 256GB', imei: '356938035643809', declared_value: '72990' } },
  { product: 'travel', name: 'Liza Fernandez', status: 'Quote', daysAgo: 0, values: { insured_person: 'Liza Fernandez', trip_type: 'Single trip', destination_region: 'Asia', destination: 'Osaka, Japan', departure_date: isoDate(addDays(new Date(), 18)), return_date: isoDate(addDays(new Date(), 25)), plan: 'Plus' } },
  { product: 'personal-accident', name: 'Ramon Santos', status: 'Verified', daysAgo: 6, values: { insured_person: 'Ramon Santos', occupation: 'Site engineer', occupation_class: 'Class 2 — light manual', sum_assured: '1000000', medical_reimbursement: true } },
  { product: 'commercial', name: 'Kusina ni Aling Nena', status: 'Quote', daysAgo: 2, values: { business_name: 'Kusina ni Aling Nena', occupancy: 'Retail / restaurant', construction_class: 'Class B — mixed', client_address: 'Maginhawa St, Quezon City', building_value: '3500000', contents_value: '1200000', business_interruption: true, cgl_limit: '₱1,000,000' } },
  { product: 'pet', name: 'Bea Mendoza', status: 'Active', daysAgo: 21, values: { pet_name: 'Mochi', species: 'Dog', breed: 'Shih Tzu', pet_age: '3', plan: 'Standard' } },
  { product: 'life', name: 'Carlo Bautista', status: 'Pending', daysAgo: 4, values: { insured_person: 'Carlo Bautista', insured_birthday: '1988-04-12', gender: 'Male', smoker: false, sum_assured: '2000000', term_years: '20 years' } },
  { product: 'ctpl', name: 'Jun Pascual', status: 'Active', daysAgo: 12, values: { vehicle_label: '2019 Honda Click 125i', vehicle_plate: '123 ABC', vehicle_type: 'Motorcycle / tricycle', class_label: '1 year' } },
  { product: 'home', name: 'Grace Lim', status: 'Quote', daysAgo: 5, values: { vehicle_label: '2-storey house', client_address: 'BF Homes, Parañaque', declared_value: '6500000', sum_assured: '800000', flood_zone: true } },
  { product: 'motor', name: 'Paolo Garcia', status: 'Active', daysAgo: 340, values: { vehicle_label: '2021 Mitsubishi Montero Sport', vehicle_plate: 'DAQ 7710', vehicle_type: 'SUV / AUV', declared_value: '1450000', vtpl_bi: '₱300,000', vtpl_pd: '₱300,000', aon: true, auto_pa: true } },
  { product: 'mobile', name: 'Trisha Navarro', status: 'Active', daysAgo: 45, values: { vehicle_label: 'Samsung Galaxy S24 Ultra 512GB', imei: '490154203237518', declared_value: '69990' } },
  { product: 'travel', name: 'Miguel Torres', status: 'Expired', daysAgo: 90, values: { insured_person: 'Miguel Torres', trip_type: 'Single trip', destination_region: 'Worldwide', destination: 'San Francisco, USA', departure_date: isoDate(addDays(new Date(), -80)), return_date: isoDate(addDays(new Date(), -66)), plan: 'Elite' } },
  { product: 'personal-accident', name: 'Ana Cruz', status: 'Rejected', daysAgo: 30, values: { insured_person: 'Ana Cruz', occupation: 'Rider', occupation_class: 'Class 3 — heavy manual', sum_assured: '300000' } },
  { product: 'motor', name: 'Joy Ramos', status: 'Claimed', daysAgo: 120, values: { vehicle_label: '2022 Ford Ranger XLT', vehicle_plate: 'NFK 2290', vehicle_type: 'Pick-up', declared_value: '1180000', vtpl_bi: '₱200,000', vtpl_pd: '₱200,000', aon: false, auto_pa: true } }
]

const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')

export function seedQuotes(now: Date = new Date()): QuoteRecord[] {
  return SEEDS.map((seed, index) => {
    const product = PRODUCTS[seed.product]
    const created = addDays(now, -seed.daysAgo)
    const values: FormValues = { ...product.defaults, ...seed.values }
    const issued = seed.status !== 'Quote' && seed.status !== 'Rejected'
    return {
      id: `seed-${index + 1}`,
      product: seed.product,
      status: seed.status,
      client: { name: seed.name, mobile: `+63 917 ${String(1000000 + index * 73421).slice(0, 3)} ${String(4000 + index * 311).slice(0, 4)}`, email: `${slug(seed.name)}@mail.ph`, birthdate: '', address: '' },
      values,
      premium: product.id === 'mobile' ? mobilePremium(Number(values.declared_value)) : product.rate({ ...values, client_name: seed.name, insured_mobile_number: 'x', inception_from: 'x', inception_to: 'x' }),
      risk: product.describeRisk(values),
      insurer: seed.product === 'life' ? 'Sun Life' : 'Bethel General Insurance',
      policyNumber: issued ? `${seed.product.slice(0, 2).toUpperCase()}-B3502-${String(350 + index).padStart(7, '0')}` : '',
      inceptionFrom: isoDate(created),
      inceptionTo: isoDate(addMonths(created, 12)),
      agent: index % 3 === 0 ? 'Rhea Aquino' : index % 3 === 1 ? 'Dennis Ocampo' : 'You',
      createdDate: created.toISOString(),
      updatedDate: created.toISOString(),
      notes: ''
    }
  })
}

/** All-coverages premium for seeded phones (OD 3.5% + TH 3.5% + WR 2% + OTH 1%, plus taxes). */
function mobilePremium(fmv: number) {
  const basic = Math.round(fmv * 0.1 * 100) / 100
  return {
    lines: [{ label: 'All coverages', amount: basic }],
    basicPremium: basic,
    taxes: [],
    totalTaxes: Math.round(basic * 0.25 * 100) / 100,
    totalAmountDue: Math.round(basic * 1.25 * 100) / 100,
    issues: []
  }
}

export function seedClaims(quotes: QuoteRecord[], now: Date = new Date()): ClaimRecord[] {
  const byId = (id: string) => quotes.find((quote) => quote.id === id)
  const make = (id: string, quoteId: string, type: string, days: number, status: ClaimRecord['status'], claimed: number, assessed: number, description: string): ClaimRecord => {
    const quote = byId(quoteId)
    return {
      id,
      claimNumber: `CLM-${String(26000 + Number(id.replace(/\D/g, ''))).padStart(6, '0')}`,
      quoteId,
      policyNumber: quote?.policyNumber ?? '',
      product: quote?.product ?? 'motor',
      claimant: quote?.client.name ?? '',
      incidentDate: isoDate(addDays(now, -days)),
      incidentType: type,
      description,
      location: 'Metro Manila',
      items: [{ description, amountClaimed: claimed, amountAssessed: assessed }],
      status,
      createdDate: addDays(now, -days + 1).toISOString(),
      updatedDate: addDays(now, -days + 2).toISOString()
    }
  }
  return [
    make('claim-1', 'seed-14', 'Collision', 40, 'Paid', 32400, 28750, 'Rear bumper and tailgate repair'),
    make('claim-2', 'seed-11', 'Liquid damage', 6, 'Under Review', 18500, 0, 'Screen and board replacement after water exposure'),
    make('claim-3', 'seed-6', 'Illness', 2, 'Filed', 7400, 0, 'Vet consult and lab tests for gastroenteritis')
  ]
}

export function seedReminders(quotes: QuoteRecord[], now: Date = new Date()): ReminderTask[] {
  const at = (days: number, hour: number) => {
    const date = addDays(now, days)
    date.setHours(hour, 0, 0, 0)
    return date.toISOString()
  }
  return [
    { id: 'rem-1', title: `Collect documents from ${quotes[1]?.client.name ?? 'client'}`, dueDatetime: at(0, 15), location: '', notes: 'Proof of purchase and box photo for IMEI.', quoteId: quotes[1]?.id ?? '', done: false },
    { id: 'rem-2', title: `Renewal call: ${quotes[9]?.client.name ?? 'client'}`, dueDatetime: at(1, 10), location: 'Phone', notes: 'Motor policy expires this month.', quoteId: quotes[9]?.id ?? '', done: false },
    { id: 'rem-3', title: 'Send travel quote to Liza Fernandez', dueDatetime: at(2, 9), location: '', notes: '', quoteId: quotes[2]?.id ?? '', done: false }
  ]
}
