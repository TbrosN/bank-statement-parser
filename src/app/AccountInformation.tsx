'use client'

import React from 'react';
import { Purchase } from './Parser';

type AccountInformationProps = {
  name: string;
  address: string;
  purchases: Purchase[];
  totalDeposits: number;
  totalWithdrawals: number;
};

const AccountInformation: React.FC<AccountInformationProps> = ({ name, address, purchases, totalDeposits, totalWithdrawals}) => {

  return (
    <div className="bg-white shadow-md rounded-lg p-6 max-w-6xl w-full">
      {/* User Info */}
      <div>
        <h1 className="text-xl font-semibold text-gray-700">{name}</h1>
        <p className="text-gray-500">{address}</p>
      </div>

      {/* Total Deposits and Withdrawals */}
      <div className="flex justify-between py-5">
        <div className="bg-green-100 text-green-700 p-4 rounded-lg w-1/2 mr-2">
          <h3 className="text-lg font-semibold">Total Deposits</h3>
          <p className="text-2xl font-bold">${totalDeposits.toFixed(2)}</p>
        </div>
        <div className="bg-red-100 text-red-700 p-4 rounded-lg w-1/2 ml-2">
          <h3 className="text-lg font-semibold">Total Withdrawals</h3>
          <p className="text-2xl font-bold">${totalWithdrawals.toFixed(2)}</p>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Walmart Purchases</h2>
        <table className="min-w-full bg-white table-auto">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((transaction, index) => (
              <tr
                key={index}
                className={`${
                  index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                } hover:bg-gray-100 transition-colors duration-200`}
              >
                <td className="py-3 px-4 text-gray-700">{transaction.date}</td>
                <td className="py-3 px-4 text-gray-700">{transaction.description}</td>
                <td className="py-3 px-4 text-right text-red-500">
                  {`-$${transaction.amount.toFixed(2)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>);
}

export default AccountInformation;