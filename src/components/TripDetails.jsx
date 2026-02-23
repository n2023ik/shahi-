import React from 'react';

const calculateDelay = (pickupRaisedOn, actualPickup) => {
  if (!pickupRaisedOn || !actualPickup) return null;
  
  const raised = new Date(pickupRaisedOn);
  const actual = new Date(actualPickup);
  const diffTime = actual - raised;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 0 ? diffDays : 0;
};

export const TripDetails = ({ tripData }) => {
  const delay = calculateDelay(tripData.pickupRaisedOn, tripData.actualPickup);

  return (
    <div>
      <h2>Trip Details</h2>
      <div className="detail-item">
        <label className="detail-label">Pickup Raised On</label>
        <span className="detail-value">{tripData.pickupRaisedOn}</span>
      </div>
      <div className="detail-item">
        <label className="detail-label">Actual Pickup</label>
        <span className="detail-value">{tripData.actualPickup}</span>
      </div>
      <div className="detail-item">
        <label className="detail-label">DELAY (DAYS)</label>
        <span 
          className="detail-value" 
          style={{ 
            color: delay > 3 ? 'red' : 'green',
            fontWeight: delay > 3 ? 'bold' : 'normal'
          }}
        >
          {delay !== null ? `${delay} days` : '—'}
        </span>
      </div>
    </div>
  );
};