
import React from 'react';

const Spinner: React.FC<{ text?: string }> = ({ text = "Loading..." }) => (
    <div className="flex flex-col items-center justify-center space-y-2">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
        <p className="text-gray-400">{text}</p>
    </div>
);

export default Spinner;
