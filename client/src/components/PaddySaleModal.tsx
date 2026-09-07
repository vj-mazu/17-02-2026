import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';
import { createPortal } from 'react-dom';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.4);
  overflow-y: auto;
`;

const ModalContent = styled.div`
  background: white;
  width: 95%;
  max-width: 700px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  padding: 1.25rem 1.5rem;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const InfoBox = styled.div`
  background: #f0fdf4;
  border: 1.5px solid #10b981;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;

  .label {
    font-size: 0.8rem;
    color: #065f46;
    font-weight: 600;
  }
  .value {
    font-size: 1.1rem;
    font-weight: 700;
    color: #047857;
  }
  .highlight {
    grid-column: span 2;
    border-top: 1px dashed #a7f3d0;
    padding-top: 0.75rem;
    margin-top: 0.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    
    > div {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
    
    .label {
      font-size: 0.75rem;
      color: #065f46;
      font-weight: 600;
      opacity: 0.9;
    }
    
    .value {
      font-size: 0.95rem;
      font-weight: 700;
      color: #047857;
    }
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  grid-column: ${props => props.$fullWidth ? 'span 2' : 'auto'};

  @media (max-width: 580px) {
    grid-column: auto;
  }
`;

const Label = styled.label`
  font-weight: 600;
  color: #374151;
  font-size: 0.85rem;
`;

const Input = styled.input`
  padding: 0.65rem 0.85rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
`;

const Select = styled.select`
  padding: 0.65rem 0.85rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
`;

const Button = styled.button`
  padding: 0.65rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
`;

const CancelButton = styled(Button)`
  background: #e5e7eb;
  color: #4b5563;
  
  &:hover {
    background: #d1d5db;
  }
`;

const SaveButton = styled(Button)`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

interface PaddySaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Kunchinittu {
  id: number;
  name: string;
  code: string;
  variety?: { name: string };
  warehouse?: { id: number; name: string; code: string };
}

export const PaddySaleModal: React.FC<PaddySaleModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [kunchinittus, setKunchinittus] = useState<Kunchinittu[]>([]);
  const [selectedKunch, setSelectedKunch] = useState<Kunchinittu | null>(null);
  const [stockInfo, setStockInfo] = useState<{ bags: number; netWeight: number } | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [averageRate, setAverageRate] = useState<number>(0);

  // Form Fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [soldTo, setSoldTo] = useState('');
  const [bags, setBags] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [lorryNumber, setLorryNumber] = useState('');
  const [wbNo, setWbNo] = useState('');
  const [billNo, setBillNo] = useState('');
  const [remarks, setRemarks] = useState('');

  // Fetch Kunchinittus list
  useEffect(() => {
    if (!isOpen) return;

    axios.get('/ledger/kunchinittus')
      .then(res => {
        const data = res.data as any;
        const kList = Array.isArray(data)
          ? data
          : (data && Array.isArray(data.kunchinittus) ? data.kunchinittus : []);
        setKunchinittus(kList.filter((k: any) => !k.isClosed));
      })
      .catch(err => {
        console.error('Error fetching kunchinittus:', err);
        toast.error('Failed to load Godowns list');
      });
  }, [isOpen]);

  // Fetch Stock Info when Kunchinittu changes
  const handleKunchChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const kunchId = e.target.value;
    if (!kunchId) {
      setSelectedKunch(null);
      setStockInfo(null);
      return;
    }

    const found = kunchinittus.find(k => k.id.toString() === kunchId) || null;
    setSelectedKunch(found);

    if (found) {
      setLoadingStock(true);
      try {
        const res = await axios.get(`/ledger/kunchinittu/${found.id}`);
        const remaining = (res.data as any).totals?.remaining || { bags: 0, netWeight: 0 };
        const avg = (res.data as any).kunchinittu?.averageRate || 0;
        setStockInfo(remaining);
        setAverageRate(avg);
      } catch (err) {
        console.error('Error fetching stock:', err);
        toast.error('Failed to load stock details');
        setStockInfo(null);
        setAverageRate(0);
      } finally {
        setLoadingStock(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKunch) {
      toast.error('Please select a Kunchinittu');
      return;
    }
    if (!soldTo.trim()) {
      toast.error('Please enter Sold to Party Name');
      return;
    }
    const bagsCount = parseInt(bags) || 0;
    if (bagsCount <= 0) {
      toast.error('Please enter valid bags quantity');
      return;
    }
    const netWt = parseFloat(netWeight) || 0;
    if (netWt <= 0) {
      toast.error('Please enter valid weights');
      return;
    }

    // Check availability limit
    if (stockInfo) {
      if (bagsCount > stockInfo.bags) {
        toast.error(`Insufficient stock! Selected Godown only has ${stockInfo.bags} bags.`);
        return;
      }
      if (netWt > stockInfo.netWeight) {
        toast.error(`Insufficient stock! Selected Godown only has ${stockInfo.netWeight.toLocaleString()} kg net weight.`);
        return;
      }
    }

    setSaving(true);
    try {
      await axios.post('/arrivals', {
        date,
        movementType: 'sale',
        fromKunchinintuId: selectedKunch.id,
        fromWarehouseId: selectedKunch.warehouse?.id,
        variety: selectedKunch.variety?.name,
        bags: bagsCount,
        broker: soldTo, // customer name
        fromLocation: soldTo, // customer name
        grossWeight: 0,
        tareWeight: 0,
        netWeight: netWt,
        lorryNumber: lorryNumber.toUpperCase().trim(),
        wbNo: wbNo.toUpperCase().trim(),
        billNo: billNo.toUpperCase().trim(),
        remarks: remarks.trim()
      });

      toast.success('Paddy Sale recorded successfully!');
      onSuccess();
      onClose();
      // Reset form
      setSelectedKunch(null);
      setStockInfo(null);
      setBags('');
      setNetWeight('');
      setLorryNumber('');
      setWbNo('');
      setBillNo('');
      setSoldTo('');
      setRemarks('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to record Paddy Sale');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <Title>Paddy Stock Sale Form</Title>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <FormGrid>
              <FormGroup>
                <Label>Sale Date *</Label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  required 
                />
              </FormGroup>

              <FormGroup>
                <Label>From Kunchinittu (Godown) *</Label>
                <Select 
                  value={selectedKunch?.id || ''} 
                  onChange={handleKunchChange} 
                  required
                >
                  <option value="">Select Kunchinittu</option>
                  {kunchinittus.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.code} ({k.warehouse?.code || 'No Wh'}) - {k.variety?.name || 'No Variety'}
                    </option>
                  ))}
                </Select>
              </FormGroup>
            </FormGrid>

            {loadingStock && (
              <div style={{ textAlign: 'center', margin: '1rem', color: '#10b981', fontWeight: 600 }}>
                Loading live stock details...
              </div>
            )}

            {selectedKunch && stockInfo && (
              <InfoBox style={{ marginTop: '1.25rem' }}>
                <div>
                  <div className="label">Variety:</div>
                  <div className="value">{selectedKunch.variety?.name || '-'}</div>
                </div>
                <div>
                  <div className="label">Warehouse:</div>
                  <div className="value">{selectedKunch.warehouse?.name} ({selectedKunch.warehouse?.code})</div>
                </div>
                 <div className="highlight">
                  <div>
                    <span className="label">Available Stock</span>
                    <span className="value">{stockInfo.bags} bags</span>
                  </div>
                  <div>
                    <span className="label">Net Weight</span>
                    <span className="value">{stockInfo.netWeight.toLocaleString()} kg</span>
                  </div>
                  <div>
                    <span className="label">Avg Bag Weight</span>
                    <span className="value">
                      {stockInfo.bags > 0 ? (stockInfo.netWeight / stockInfo.bags).toFixed(2) : '0'} kg
                    </span>
                  </div>
                  <div>
                    <span className="label">Avg Rate</span>
                    <span className="value" style={{ color: '#10b981', fontWeight: 'bold' }}>
                      {averageRate > 0 ? `₹${averageRate.toFixed(2)} / Q` : 'Not computed'}
                    </span>
                  </div>
                </div>
              </InfoBox>
            )}

            <FormGrid style={{ marginTop: selectedKunch ? '0' : '1.25rem' }}>
              <FormGroup $fullWidth>
                <Label>Sold to Party Name *</Label>
                <Input 
                  type="text" 
                  placeholder="Enter Party / Buyer Name" 
                  value={soldTo} 
                  onChange={e => setSoldTo(e.target.value)} 
                  required 
                />
              </FormGroup>

              <FormGroup>
                <Label>Bags *</Label>
                <Input 
                  type="number" 
                  placeholder="Number of bags" 
                  value={bags} 
                  onChange={e => setBags(e.target.value)} 
                  required 
                  max={stockInfo ? stockInfo.bags : undefined}
                />
              </FormGroup>

              <FormGroup>
                <Label>Net Weight (kg) *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="Net Weight" 
                  value={netWeight} 
                  onChange={e => setNetWeight(e.target.value)} 
                  required 
                />
              </FormGroup>

              <FormGroup>
                <Label>Lorry Number *</Label>
                <Input 
                  type="text" 
                  placeholder="e.g. AP 16 TY 1234" 
                  value={lorryNumber} 
                  onChange={e => setLorryNumber(e.target.value)} 
                  required 
                />
              </FormGroup>

              <FormGroup>
                <Label>Weigh Bridge (WB) Number *</Label>
                <Input 
                  type="text" 
                  placeholder="WB Slip Number" 
                  value={wbNo} 
                  onChange={e => setWbNo(e.target.value)} 
                  required 
                />
              </FormGroup>

              <FormGroup>
                <Label>Bill Number *</Label>
                <Input 
                  type="text" 
                  placeholder="Bill Number" 
                  value={billNo} 
                  onChange={e => setBillNo(e.target.value)} 
                  required 
                />
              </FormGroup>

              <FormGroup $fullWidth>
                <Label>Remarks</Label>
                <Input 
                  type="text" 
                  placeholder="Any notes..." 
                  value={remarks} 
                  onChange={e => setRemarks(e.target.value)} 
                />
              </FormGroup>
            </FormGrid>
          </ModalBody>
          <ModalFooter>
            <CancelButton type="button" onClick={onClose}>Cancel</CancelButton>
            <SaveButton type="submit" disabled={saving || (stockInfo ? (parseInt(bags) > stockInfo.bags || parseFloat(netWeight) > stockInfo.netWeight) : false)}>
              {saving ? 'Recording...' : 'Record Sale'}
            </SaveButton>
          </ModalFooter>
        </form>
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};
