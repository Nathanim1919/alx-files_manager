import dbClient from "../utils/db";

class UserController {
    static async postNew(req, res){
        const { email, password } = req.body;
        if (!email) return res.status(400).send({ error: 'Missing email' });
        if (!password) return res.status(400).send({ error: 'Missing password' });
        const user = await User.create({ email, password });
        return res.status(201).send({ id: user._id, email: user.email });
    }
}