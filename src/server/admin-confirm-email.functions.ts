// Reverting changes made in commit 8228ff39973018357eb051b9272a876bcb6200fe

// Original Imports
import { Response } from 'express';

// Example Function with Response objects
export const adminConfirmEmail = async (req, res) => {
    try {
        const user = await findUserByEmail(req.body.email);
        if (!user) {
            throw new Response('User not found', {status: 404});
        }
        // Other logic...
    } catch (error) {
        if (error instanceof Response) {
            res.status(error.status).send(error.message);
        } else {
            throw new Response('Internal Server Error', {status: 500});
        }
    }
};

// Replace other instances of throw new Error statements as needed

