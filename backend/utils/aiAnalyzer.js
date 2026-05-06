// backend/utils/aiAnalyzer.js

/**
 * Keyword-based AI analysis for crime reporting
 */

const priorityRules = [
    { priority: 'High', rank: 3, keywords: ['attack', 'weapon', 'gun', 'knife', 'fire', 'explosion', 'bomb', 'shooting', 'kidnapping', 'rape', 'murder', 'emergency', 'help'] },
    { priority: 'Medium', rank: 2, keywords: ['robbery', 'theft', 'accident', 'break-in', 'harassment', 'assault', 'stolen'] },
    { priority: 'Low', rank: 1, keywords: ['noise', 'suspicious', 'dispute', 'minor issue', 'parking problem'] }
];

const categoryRules = [
    { category: 'Theft / Burglary', keywords: ['theft', 'stolen', 'robbery', 'stole', 'burglary', 'break-in'] },
    { category: 'Assault / Physical Harm', keywords: ['attack', 'hit', 'fight', 'assault', 'punch', 'weapon'] },
    { category: 'Cybercrime / Fraud', keywords: ['hacked', 'fraud', 'bank', 'cyber', 'online', 'scam'] },
    { category: 'Public Nuisance', keywords: ['noise', 'parking', 'loud', 'nuisance'] }
];

/**
 * Automatically detects priority based on description
 */
exports.detectPriority = (description) => {
    const text = description.toLowerCase();
    for (const rule of priorityRules) {
        if (rule.keywords.some(k => text.includes(k))) {
            return { priority: rule.priority, rank: rule.rank };
        }
    }
    return { priority: 'Low', rank: 1 };
};

/**
 * Automatically detects category based on description
 */
exports.detectCategory = (description) => {
    const text = description.toLowerCase();
    for (const rule of categoryRules) {
        if (rule.keywords.some(k => text.includes(k))) return rule.category;
    }
    return 'Other';
};

/**
 * Generates a standard title for the report
 */
exports.generateTitle = (type, location) => {
    return `${type} Incident at ${location}`;
};

/**
 * Returns the numeric rank for a priority string
 */
exports.getPriorityRank = (priority) => {
    const rule = priorityRules.find(r => r.priority === priority);
    return rule ? rule.rank : 1;
};
