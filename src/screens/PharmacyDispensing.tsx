import { useMemo, useState } from 'react';
import {
  Pill,
  Package,
  AlertTriangle,
  Search,
  CheckCircle2,
  Clock,
  ShoppingCart,
  Boxes,
  Loader2,
  XCircle,
  TrendingDown,
  Bell,
} from 'lucide-react';
import { Card, CardHeader, StatusBadge, Button, EmptyState, SectionTitle, Badge } from '@/components/ui';
import type { MedicationStock, DispensingRecord } from '@/types';
import { medicationStock as initialStock, dispensingRecords as initialDispensing } from '@/data/pharmacy';
import { prescriptions as initialPrescriptions } from '@/data/prescriptions';
import { getPatientName } from '@/data/patients';
import { formatFCFA, formatDate } from '@/utils/format';

type Tab = 'dispensing' | 'stock';

interface LocalPrescription {
  id: string;
  patientId: string;
  date: string;
  doctor: string;
  medications: { name: string; dosage: string; frequency: string; duration: string; quantity: number; instructions: string }[];
  status: 'active' | 'dispensed' | 'cancelled';
  notes?: string;
}

export default function PharmacyDispensing() {
  const [tab, setTab] = useState<Tab>('dispensing');
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [stockAlert, setStockAlert] = useState<string | null>(null);
  const [dispensingId, setDispensingId] = useState<string | null>(null);
  const [dispensedIds, setDispensedIds] = useState<Set<string>>(new Set());

  const [stock, setStock] = useState<MedicationStock[]>(initialStock);
  const [dispensingRecords, setDispensingRecords] = useState<DispensingRecord[]>(initialDispensing);
  const [prescriptions, setPrescriptions] = useState<LocalPrescription[]>(initialPrescriptions as LocalPrescription[]);
  const [rupturedMeds, setRupturedMeds] = useState<Set<string>>(new Set());

  const pendingPrescriptions = useMemo(
    () => prescriptions.filter((p) => p.status === 'active' && !dispensedIds.has(p.id)),
    [prescriptions, dispensedIds],
  );

  const lowStockItems = useMemo(() => stock.filter((m) => m.stock < m.minStock), [stock]);

  const filteredStock = useMemo(() => {
    if (!search.trim()) return stock;
    const q = search.toLowerCase();
    return stock.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.batchNumber.toLowerCase().includes(q),
    );
  }, [search, stock]);

  function handleDispense(prescriptionId: string) {
    const rx = prescriptions.find((p) => p.id === prescriptionId);
    if (!rx) return;

    // Check stock for each medication
    const outOfStockMeds: string[] = [];
    const updatedStock = [...stock];

    for (const med of rx.medications) {
      const stockItem = updatedStock.find((s) => s.name.toLowerCase() === med.name.toLowerCase());
      if (!stockItem || stockItem.stock < med.quantity) {
        outOfStockMeds.push(med.name);
        if (stockItem && stockItem.stock < stockItem.minStock) {
          setRupturedMeds((prev) => new Set([...prev, stockItem.id]));
        }
      }
    }

    if (outOfStockMeds.length > 0) {
      setStockAlert(
        `Rupture de stock: ${outOfStockMeds.join(', ')} — dispensation impossible. Le stock sera réapprovisionné.`,
      );
      setTimeout(() => setStockAlert(null), 5000);
      return;
    }

    // Simulate dispensing process
    setDispensingId(prescriptionId);
    setTimeout(() => {
      // Deduct stock
      for (const med of rx.medications) {
        const idx = updatedStock.findIndex((s) => s.name.toLowerCase() === med.name.toLowerCase());
        if (idx >= 0) {
          updatedStock[idx] = { ...updatedStock[idx], stock: updatedStock[idx].stock - med.quantity };
          if (updatedStock[idx].stock < updatedStock[idx].minStock) {
            setRupturedMeds((prev) => new Set([...prev, updatedStock[idx].id]));
          }
        }
      }
      setStock(updatedStock);

      // Mark prescription as dispensed
      setDispensedIds((prev) => new Set([...prev, prescriptionId]));
      setPrescriptions((prev) =>
        prev.map((p) => (p.id === prescriptionId ? { ...p, status: 'dispensed' as const } : p)),
      );

      // Add dispensing record
      const totalCost = rx.medications.reduce((sum, med) => {
        const stockItem = stock.find((s) => s.name.toLowerCase() === med.name.toLowerCase());
        return sum + (stockItem ? stockItem.pricePerUnit * med.quantity : 0);
      }, 0);

      const newRecord: DispensingRecord = {
        id: `d${Date.now()}`,
        patientId: rx.patientId,
        patientName: getPatientName(rx.patientId),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        pharmacist: 'Pharm. Yao Kouassi',
        medications: rx.medications.map((m) => ({ name: m.name, quantity: m.quantity, dosage: m.dosage })),
        totalCost,
        prescriptionId: rx.id,
        status: 'dispensed',
      };
      setDispensingRecords([newRecord, ...dispensingRecords]);

      setSuccessMsg(`Prescription délivrée pour ${getPatientName(rx.patientId)} — ${formatFCFA(totalCost)}`);
      setDispensingId(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    }, 1200);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-navy-900">Dispensation pharmacie</h2>
        <p className="text-sm text-navy-500 mt-0.5">Délivrance des prescriptions et gestion des stocks</p>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm animate-fade-in">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          {successMsg}
        </div>
      )}

      {/* Stock rupture alert */}
      {stockAlert && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 border-2 border-red-200 text-red-800 text-sm animate-fade-in">
          <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          {stockAlert}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-navy-100">
        <button
          onClick={() => setTab('dispensing')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'dispensing'
              ? 'border-medical-600 text-medical-700'
              : 'border-transparent text-navy-500 hover:text-navy-700'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Dispensation
        </button>
        <button
          onClick={() => setTab('stock')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'stock'
              ? 'border-medical-600 text-medical-700'
              : 'border-transparent text-navy-500 hover:text-navy-700'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Stocks
          {lowStockItems.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
              {lowStockItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Dispensing tab */}
      {tab === 'dispensing' && (
        <div className="space-y-6">
          {/* Pending prescriptions */}
          <Card>
            <CardHeader title="Prescriptions en attente" subtitle="Prescriptions actives à délivrer" />
            {pendingPrescriptions.length === 0 ? (
              <EmptyState icon={Pill} title="Aucune prescription en attente" subtitle="Toutes les prescriptions ont été traitées" />
            ) : (
              <div className="p-5 space-y-4">
                {pendingPrescriptions.map((rx) => {
                  const isDispensing = dispensingId === rx.id;
                  return (
                    <div
                      key={rx.id}
                      className={`rounded-lg border p-4 transition-all ${
                        isDispensing ? 'border-medical-300 bg-medical-50' : 'border-navy-100 hover:border-medical-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-navy-900">{getPatientName(rx.patientId)}</p>
                          <p className="text-xs text-navy-500 mt-0.5">
                            {rx.doctor} · {formatDate(rx.date)}
                          </p>
                        </div>
                        <StatusBadge status={rx.status} />
                      </div>
                      <div className="space-y-2 mb-4">
                        {rx.medications.map((med, i) => {
                          const stockItem = stock.find((s) => s.name.toLowerCase() === med.name.toLowerCase());
                          const isOutOfStock = !stockItem || stockItem.stock < med.quantity;
                          const isRuptured = stockItem && rupturedMeds.has(stockItem.id);
                          return (
                            <div
                              key={i}
                              className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 ${
                                isOutOfStock ? 'bg-red-50 border border-red-200' : 'bg-navy-50'
                              }`}
                            >
                              <div>
                                <span className="font-medium text-navy-800">{med.name}</span>
                                <span className="text-navy-500 ml-2">{med.dosage}</span>
                                {isOutOfStock && (
                                  <Badge color="red">
                                    <XCircle className="w-3 h-3" />
                                    Stock insuffisant
                                  </Badge>
                                )}
                              </div>
                              <div className="text-navy-500 text-xs">
                                {med.frequency} · {med.duration} · Qté {med.quantity}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {rx.notes && (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          {rx.notes}
                        </p>
                      )}
                      <div className="flex justify-end">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleDispense(rx.id)}
                          disabled={isDispensing}
                        >
                          {isDispensing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                              Délivrance en cours...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1.5" />
                              Délivrer
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recently dispensed */}
          <Card>
            <CardHeader title="Dispensations récentes" subtitle="Historique des délivrances du jour" />
            {dispensingRecords.length === 0 ? (
              <EmptyState icon={Clock} title="Aucune dispensation récente" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-navy-100 text-left text-navy-500">
                      <th className="px-5 py-3 font-medium">Patient</th>
                      <th className="px-5 py-3 font-medium">Médicaments</th>
                      <th className="px-5 py-3 font-medium">Pharmacien</th>
                      <th className="px-5 py-3 font-medium">Date / Heure</th>
                      <th className="px-5 py-3 font-medium text-right">Coût total</th>
                      <th className="px-5 py-3 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispensingRecords.map((rec: DispensingRecord) => (
                      <tr key={rec.id} className="border-b border-navy-50 hover:bg-navy-50/50">
                        <td className="px-5 py-3 font-medium text-navy-900">{rec.patientName}</td>
                        <td className="px-5 py-3 text-navy-600">
                          <div className="space-y-0.5">
                            {rec.medications.map((m, i) => (
                              <div key={i} className="text-xs">
                                {m.name} <span className="text-navy-400">x{m.quantity}</span> · {m.dosage}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-navy-600">{rec.pharmacist}</td>
                        <td className="px-5 py-3 text-navy-500 whitespace-nowrap">
                          {formatDate(rec.date)} · {rec.time}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-navy-900 whitespace-nowrap">
                          {formatFCFA(rec.totalCost)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={rec.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Stock tab */}
      {tab === 'stock' && (
        <div className="space-y-6">
          {/* Low stock alert */}
          {lowStockItems.length > 0 && (
            <Card className="border-red-200 bg-red-50/50">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-red-600" />
                  </div>
                  <SectionTitle>
                    Alerte stock bas — {lowStockItems.length} produit{lowStockItems.length > 1 ? 's' : ''} sous le seuil minimum
                  </SectionTitle>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lowStockItems.map((m) => {
                    const isRuptured = rupturedMeds.has(m.id);
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between bg-white rounded-lg border px-3 py-2 transition-all ${
                          isRuptured ? 'border-red-400 ring-2 ring-red-200 animate-pulse-soft' : 'border-red-200'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-navy-900">{m.name}</p>
                          <p className="text-xs text-navy-500">{m.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-red-600 flex items-center gap-1">
                            {isRuptured && <TrendingDown className="w-3 h-3" />}
                            {m.stock}
                          </p>
                          <p className="text-xs text-navy-400">min {m.minStock}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Stock table */}
          <Card>
            <CardHeader
              title="Stock de médicaments"
              subtitle={`${filteredStock.length} produit(s)`}
              action={
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="pl-9 pr-3 py-1.5 rounded-lg border border-navy-200 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-medical-400 focus:border-transparent w-56"
                  />
                </div>
              }
            />
            {filteredStock.length === 0 ? (
              <EmptyState icon={Package} title="Aucun produit trouvé" subtitle="Modifiez votre recherche" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-navy-100 text-left text-navy-500">
                      <th className="px-5 py-3 font-medium">Médicament</th>
                      <th className="px-5 py-3 font-medium">Catégorie</th>
                      <th className="px-5 py-3 font-medium text-right">Stock</th>
                      <th className="px-5 py-3 font-medium text-right">Stock min.</th>
                      <th className="px-5 py-3 font-medium text-right">Prix unitaire</th>
                      <th className="px-5 py-3 font-medium">Péremption</th>
                      <th className="px-5 py-3 font-medium">N° lot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map((m: MedicationStock) => {
                      const isLow = m.stock < m.minStock;
                      const isRuptured = rupturedMeds.has(m.id);
                      return (
                        <tr
                          key={m.id}
                          className={`border-b border-navy-50 hover:bg-navy-50/50 transition-colors ${
                            isRuptured ? 'bg-red-50' : ''
                          }`}
                        >
                          <td className="px-5 py-3">
                            <p className="font-medium text-navy-900">{m.name}</p>
                            <p className="text-xs text-navy-400">{m.unit}</p>
                          </td>
                          <td className="px-5 py-3 text-navy-600">{m.category}</td>
                          <td className={`px-5 py-3 text-right font-semibold ${isLow ? 'text-red-600' : 'text-navy-900'}`}>
                            {m.stock}
                          </td>
                          <td className="px-5 py-3 text-right text-navy-500">{m.minStock}</td>
                          <td className="px-5 py-3 text-right text-navy-700 whitespace-nowrap">{formatFCFA(m.pricePerUnit)}</td>
                          <td className="px-5 py-3 text-navy-500 whitespace-nowrap">{formatDate(m.expiryDate)}</td>
                          <td className="px-5 py-3 text-navy-500 font-mono text-xs">{m.batchNumber}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
