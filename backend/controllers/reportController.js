const Report = require('../models/Report');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { detectPriority, detectCategory, generateTitle, getPriorityRank } = require('../utils/aiAnalyzer');
const { getCoords } = require('../utils/geodata');

let mapStatsCache = {
    data: null,
    expiresAt: 0
};

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private (Police/Admin)
exports.getReports = async (req, res) => {
    try {
        let query;

        // If user is a regular citizen, they only see their own reports
        if (req.user.role === 'Citizen') {
            query = Report.find({ user: req.user.id }).sort('-createdAt').lean();
        } else {
            // Police and Admin see everything
            query = Report.find().sort('-createdAt').populate({
                path: 'user',
                select: 'name email'
            }).lean();
        }

        const reports = await query;

        res.status(200).json({
            success: true,
            count: reports.length,
            data: reports
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get single report
// @route   GET /api/reports/:id
// @access  Private
exports.getReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id).populate({
            path: 'user',
            select: 'name email'
        });

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        // Make sure user is report owner or official
        const ownerId = report.user && report.user._id ? report.user._id.toString() : report.user.toString();
        if (ownerId !== req.user.id && req.user.role === 'Citizen') {
            return res.status(401).json({ success: false, message: 'Not authorized to view this report' });
        }

        res.status(200).json({ success: true, data: report });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Create new report
// @route   POST /api/reports
// @access  Private (Citizen)
exports.createReport = async (req, res) => {
    try {
        const { description, location, crimeType, priority: userPriority } = req.body;

        if (!description || !location || !(crimeType || detectCategory(description || ''))) {
            return res.status(400).json({
                success: false,
                message: 'Description, location, and crime type are required'
            });
        }
        
        // 1. AI: Analyze Description
        const aiAnalysis = detectPriority(description);
        const aiCategory = detectCategory(description);
        
        // 2. Logic: Handle Priority Override
        const requestedPriority = userPriority || 'Low';
        const userRank = getPriorityRank(requestedPriority);
        let finalPriority = requestedPriority;
        let overrideMessage = null;

        if (aiAnalysis.rank > userRank) {
            finalPriority = aiAnalysis.priority;
            overrideMessage = `Priority automatically upgraded to ${finalPriority.toUpperCase()} based on incident description analysis.`;
        }

        // 3. Logic: Auto-generate Title
        const finalTitle = generateTitle(crimeType || aiCategory, location);

        // 4. Create record
        const report = await Report.create({
            user: req.user.id,
            title: finalTitle,
            description: description.trim(),
            crimeType: crimeType || aiCategory,
            location: location.trim(),
            priority: finalPriority,
            status: 'Unassigned',
            evidence: req.file ? `/uploads/${req.file.filename}` : 'no-image.jpg'
        });

        res.status(201).json({
            success: true,
            data: report,
            overrideMessage
        });

        mapStatsCache = {
            data: null,
            expiresAt: 0
        };

        // NOTIFICATION: Notify all Police and Admins about new report
        const officials = await User.find({ role: { $in: ['Police', 'Admin'] } });
        const notifications = officials.map(off => ({
            user: off._id,
            title: 'New Crime Report',
            message: `A new ${report.crimeType} has been reported in ${report.location}.`,
            type: 'NewReport'
        }));
        await Notification.insertMany(notifications);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update report (Status/Priority)
// @route   PUT /api/reports/:id
// @access  Private (Police/Admin)
exports.updateReport = async (req, res) => {
    try {
        let report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        // Only officials can update status/priority
        if (req.user.role === 'Citizen') {
            return res.status(401).json({ success: false, message: 'Not authorized to update reports' });
        }

        report = await Report.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        mapStatsCache = {
            data: null,
            expiresAt: 0
        };

        // NOTIFICATION: Notify the citizen about status update
        if (req.body.status || req.body.priority) {
            await Notification.create({
                user: report.user,
                title: 'Report Update',
                message: `Your report (Ref: SF-${report._id.toString().slice(-4).toUpperCase()}) has been updated to "${report.status}" status with "${report.priority}" priority.`,
                type: 'StatusUpdate'
            });
        }

        res.status(200).json({ success: true, data: report });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get report statistics for map
// @route   GET /api/reports/map-stats
// @access  Public
exports.getMapStats = async (req, res) => {
    try {
        if (mapStatsCache.data && mapStatsCache.expiresAt > Date.now()) {
            res.status(200).json({
                success: true,
                data: mapStatsCache.data,
                cached: true
            });
            return;
        }

        const stats = await Report.aggregate([
            {
                $group: {
                    _id: '$location',
                    count: { $sum: 1 },
                    lastReport: { $max: '$createdAt' }
                }
            }
        ]);

        const hotspots = stats.map(s => {
            const coords = getCoords(s._id);
            if (!coords) return null;

            let risk = 'Low';
            if (s.count >= 5) risk = 'High';
            else if (s.count >= 2) risk = 'Medium';

            return {
                location: s._id,
                lat: coords.lat,
                lng: coords.lng,
                count: s.count,
                risk: risk,
                lastReport: s.lastReport
            };
        }).filter(h => h !== null);

        mapStatsCache = {
            data: hotspots,
            expiresAt: Date.now() + 30 * 1000
        };

        res.status(200).json({
            success: true,
            data: hotspots
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Delete report
// @route   DELETE /api/reports/:id
// @access  Private (Admin)
exports.deleteReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        await report.deleteOne();

        mapStatsCache = {
            data: null,
            expiresAt: 0
        };

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
