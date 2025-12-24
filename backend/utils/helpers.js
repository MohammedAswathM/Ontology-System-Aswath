const { v4: uuidv4 } = require('uuid');

const helpers = {
    // Generates a consistent ID based on type and label
    generateId: (type, label) => {
        if (!label) return uuidv4();
        
        // Clean the label: lower case, replace spaces with underscores
        const cleanLabel = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        // Prefix map
        const prefixes = {
            'organization': 'org',
            'department': 'dept',
            'role': 'role',
            'process': 'proc',
            'resource': 'res',
            'product': 'prod',
            'customer': 'cust',
            'metric': 'met'
        };

        const prefix = prefixes[type.toLowerCase()] || 'ent';
        return `${prefix}_${cleanLabel}`;
    },

    generateUniqueId: () => {
        return uuidv4();
    },

    formatLabel: (id) => {
        if (!id) return '';
        const parts = id.split('_');
        if (parts.length > 1) {
            return parts.slice(1).join(' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        return id;
    }
};

module.exports = helpers;