// Helper utilities

function generateId(prefix, name) {
    const cleaned = name.toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 30);
    return `${prefix}_${cleaned}`;
}

function formatDate(date) {
    return new Date(date).toISOString().split('T')[0];
}

function sanitizeInput(input) {
    return input.trim().replace(/[<>]/g, '');
}

module.exports = {
    generateId,
    formatDate,
    sanitizeInput
};