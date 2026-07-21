export const config = {
    runtime: 'nodejs'
};

export default function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
        success: true,
        message: 'Kagenou API Server is running.',
        status: 'online'
    })
};
