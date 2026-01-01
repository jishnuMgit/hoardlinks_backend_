import express from 'express'
import { CreateUserRaw, login, logout, Register } from '#controllers/authControllers.js'
import { verifyToken } from '##/middlewares/verifyToken.js'

const router = express.Router()

router.route('/login').post(
  /*  #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        $ref: "#/components/schemas/loginSchema"
                    },
                    examples: {
                      loginExample: {$ref: "#/components/examples/loginSchema"}
                    }
                }
            }
        } 
    */
  login
)
router.route('/logout').post( logout)
router.route('/register').post(verifyToken, Register)
router.route('/create/user').post( CreateUserRaw)

export default router
