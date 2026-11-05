import type { MedicationStock, DispensingRecord } from '@/types';

export const medicationStock: MedicationStock[] = [
  { id: 'ms001', name: 'Amlodipine', category: 'Antihypertenseur', unit: 'comprimé', stock: 450, minStock: 200, pricePerUnit: 150, expiryDate: '2027-06-30', batchNumber: 'AML-2026-001' },
  { id: 'ms002', name: 'Paracétamol', category: 'Antalgique', unit: 'comprimé', stock: 1200, minStock: 500, pricePerUnit: 50, expiryDate: '2027-12-31', batchNumber: 'PAR-2026-003' },
  { id: 'ms003', name: 'Furosémide', category: 'Diurétique', unit: 'comprimé', stock: 80, minStock: 100, pricePerUnit: 200, expiryDate: '2027-03-15', batchNumber: 'FUR-2026-002' },
  { id: 'ms004', name: 'Ramipril', category: 'IEC', unit: 'comprimé', stock: 320, minStock: 150, pricePerUnit: 180, expiryDate: '2027-08-20', batchNumber: 'RAM-2026-001' },
  { id: 'ms005', name: 'Salbutamol', category: 'Bronchodilatateur', unit: 'flacon', stock: 45, minStock: 30, pricePerUnit: 2500, expiryDate: '2027-05-10', batchNumber: 'SAL-2026-002' },
  { id: 'ms006', name: 'Metformine', category: 'Antidiabétique', unit: 'comprimé', stock: 600, minStock: 300, pricePerUnit: 120, expiryDate: '2027-09-01', batchNumber: 'MET-2026-001' },
  { id: 'ms007', name: 'Amoxicilline', category: 'Antibiotique', unit: 'gélule', stock: 15, minStock: 200, pricePerUnit: 100, expiryDate: '2026-12-15', batchNumber: 'AMX-2026-004' },
  { id: 'ms008', name: 'Sérum physiologique NaCl 0.9%', category: 'Perfusion', unit: 'flacon 500mL', stock: 200, minStock: 100, pricePerUnit: 800, expiryDate: '2028-01-31', batchNumber: 'NACL-2026-001' },
  { id: 'ms009', name: 'Insuline NPH', category: 'Antidiabétique', unit: 'flacon 10mL', stock: 25, minStock: 20, pricePerUnit: 5000, expiryDate: '2027-02-28', batchNumber: 'INS-2026-002' },
  { id: 'ms010', name: 'Oméprazole', category: 'IPP', unit: 'gélule', stock: 350, minStock: 150, pricePerUnit: 90, expiryDate: '2027-07-15', batchNumber: 'OME-2026-001' },
];

export const dispensingRecords: DispensingRecord[] = [
  {
    id: 'd001',
    patientId: 'p004',
    patientName: 'Ibrahim Koné',
    date: '2026-09-14',
    time: '10:15',
    pharmacist: 'Pharm. Yao Kouassi',
    medications: [
      { name: 'Furosémide', quantity: 7, dosage: '40mg' },
      { name: 'Ramipril', quantity: 30, dosage: '5mg' },
    ],
    totalCost: 6800,
    prescriptionId: 'rx002',
    status: 'dispensed',
  },
  {
    id: 'd002',
    patientId: 'p001',
    patientName: 'Awa Traoré',
    date: '2026-09-14',
    time: '11:00',
    pharmacist: 'Pharm. Yao Kouassi',
    medications: [
      { name: 'Amlodipine', quantity: 30, dosage: '10mg' },
      { name: 'Paracétamol', quantity: 15, dosage: '1g' },
    ],
    totalCost: 5250,
    prescriptionId: 'rx001',
    status: 'dispensed',
  },
];
