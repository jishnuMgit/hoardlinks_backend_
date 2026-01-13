import express from 'express'
import { CreateUserRaw, forgotloginID, forgotPassword, login, logout, Register, resetPassword } from '#controllers/authControllers.js'
import { verifyToken } from '##/middlewares/verifyToken.js'
import { verifyResetToken } from '##/middlewares/verifyResetToken.js'

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
router.route('/register').post( Register)
router.route('/create/user').post( CreateUserRaw)
router.route('/getprofileIdbyemail').post(forgotloginID)
router.route('/get/otp').post(forgotPassword)
router.route('/verifyotp/resetpassword').post(verifyResetToken,resetPassword)

export default router
