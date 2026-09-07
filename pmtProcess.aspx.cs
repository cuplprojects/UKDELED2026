using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Runtime.Serialization.Json;
using System.Web.Script.Serialization;
using System.Net;
using Payrequest;
using System.Text;
using System.IO;
using System.Security.Cryptography;
using System.Collections.Specialized;
using System.Collections.Generic;
using System.Collections;
using System.Xml.Linq;
using Newtonsoft.Json.Linq;
using Payresponse;
using Newtonsoft.Json;
using Payresponse;
using System.Activities.Expressions;
using Microsoft.Build.Tasks;
using System.Data.SqlClient;
using System.Data;
using System.IdentityModel.Protocols.WSTrust;
using System.ServiceModel.PeerResolvers;
using System.Activities.Statements;

public partial class test : System.Web.UI.Page
{
    globalconnection cnn = new globalconnection();
    protected void Page_Load(object sender, EventArgs e)
    {
        if(!IsPostBack)
        {
            NameValueCollection nvc = Request.Form;
            byte[] iv = { 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 };
            int iterations = 65536;
            int keysize = 256;
            // string plaintext = "{\"payInstrument\":{\"headDetails\":{\"version\":\"OTSv1.1\",\"payMode\":\"SL\",\"channel\":\"ECOMM\",\"api\":\"SALE\",\"stage\":1,\"platform\":\"WEB\"},\"merchDetails\":{\"merchId\":8952,\"userId\":\"\",\"password\":\"Test@123\",\"merchTxnId\":\"1234567890\",\"merchType\":\"R\",\"mccCode\":562,\"merchTxnDate\":\"2019-12-24 20:46:00\"},\"payDetails\":{\"prodDetails\":[{\"prodName\": \"NSE\",\"prodAmount\": 10.00}],\"amount\":10.00,\"surchargeAmount\":0.00,\"totalAmount\":10.00,\"custAccNo\":null,\"custAccIfsc\":null,\"clientCode\":\"12345\",\"txnCurrency\":\"INR\",\"remarks\":null,\"signature\":\"7c643bbd9418c23e972f5468377821d9f0486601e1749930816c409fddbc7beb5d2943d832b6382d3d4a8bd7755e914922fb85aa8c234210bf2993566686a46a\"},\"responseUrls\":{\"returnUrl\":\"http://172.21.21.136:9001/payment/ots/v1/merchresp\",\"cancelUrl\":null,\"notificationUrl\":null},\"payModeSpecificData\":{\"subChannel\":[\"BQ\"],\"bankDetails\":null,\"emiDetails\":null,\"multiProdDetails\":null,\"cardDetails\":null},\"extras\":{\"udf1\":null,\"udf2\":null,\"udf3\":null,\"udf4\":null,\"udf5\":null},\"custDetails\":{\"custFirstName\":null,\"custLastName\":null,\"custEmail\":\"test@gm.com\",\"custMobile\":null,\"billingInfo\":null}}} ";
            string encdata = nvc["encdata"];
            string passphrase1 = cnn.pay_res_key;
            string salt1 = cnn.pay_res_key;
            string Decryptval = decrypt(encdata, passphrase1, salt1, iv, iterations);
            //lbsign.Text = Decryptval;
            //   Decryptval = "{\"merchDetails\":{\"merchId\":8952,\"merchTxnId\":\"test000123\",\"merchTxnDate\":\"2021-12-03T15:24:35\"},\"payDetails\":{\"atomTxnId\":11000000174314,\"prodDetails\":[{\"prodName\":\"NSE\",\"prodAmount\":100.0}],\"amount\":100.00,\"surchargeAmount\":1.18,\"totalAmount\":101.18,\"custAccNo\":\"213232323\",\"clientCode\":\"1234\",\"txnCurrency\":\"INR\",\"signature\":\"2b12c8bfc0e3a8268eddb6f406bf4187d4d0a0064d0355446986511453922c27e38367a97fff85863d48c147a8218e9e2d5003ab121f6f61ce3914030c60caac\",\"txnInitDate\":\"2021-12-03 15:24:36\",\"txnCompleteDate\":\"2021-12-03 15:24:40\"},\"payModeSpecificData\":{\"subChannel\":[\"NB\"],\"bankDetails\":{\"otsBankId\":2001,\"bankTxnId\":\"qjUiPQ2bMQhjPXmzE1on\",\"otsBankName\":\"Atom Bank\"}},\"extras\":{\"udf1\":\"\",\"udf2\":\"\",\"udf3\":\"\",\"udf4\":\"\",\"udf5\":\"\"},\"custDetails\":{\"custEmail\":\"sagar.gopale@atomtech.in\",\"custMobile\":\"8976286911\",\"billingInfo\":{}},\"responseDetails\":{\"statusCode\":\"OTS0000\",\"message\":\"SUCCESS\",\"description\":\"TRANSACTION IS SUCCESSFUL.\"}}";
            Payresponse.Rootobject root = new Payresponse.Rootobject();
            Payresponse.Parent objectres = new Payresponse.Parent();
            objectres = new System.Web.Script.Serialization.JavaScriptSerializer().Deserialize<Payresponse.Parent>(Decryptval);


            string message = objectres.payInstrument.responseDetails.message;
            string discription = objectres.payInstrument.responseDetails.description;
            string statusCode = objectres.payInstrument.responseDetails.statusCode;
            string bankTxnId = objectres.payInstrument.payModeSpecificData.bankDetails.bankTxnId;
            string atomTxnId = objectres.payInstrument.payDetails.atomTxnId;
            string txnDate = objectres.payInstrument.payDetails.txnCompleteDate;
            string amount = objectres.payInstrument.payDetails.amount;
            string bank_charge = objectres.payInstrument.payDetails.surchargeAmount;
            string tot_amount = objectres.payInstrument.payDetails.totalAmount;
            string UserID= objectres.payInstrument.extras.udf4;
            string signature_expected= objectres.payInstrument.payDetails.signature;
            List<string> subchanel = objectres.payInstrument.payModeSpecificData.subChannel;
            string order_id = objectres.payInstrument.merchDetails.merchTxnId;
            string name = objectres.payInstrument.extras.udf2;

            string signature_data = cnn.pay_mid + atomTxnId + order_id + tot_amount + statusCode + subchanel[0].ToString() + bankTxnId;
            //lbsign.Text += "<br/>" + "generatedData -->" + signature_data;
            //lbsign.Text += "<br/>" + "TokenID -->" + atomTxnId;

            if (Validate_HMACSHA512(signature_data, signature_expected, cnn.pay_hash_res_key))
            {
                if (statusCode.Equals("OTS0000"))
                {
                    update_payment("payment_success", order_id, "SUCCESS",UserID,statusCode,message,discription,bankTxnId,bank_charge,tot_amount,name,atomTxnId);
                }
                else
                {
                    update_payment("payment_failed", atomTxnId, "FAILLED", UserID, statusCode, message, discription, bankTxnId, bank_charge, tot_amount,name,atomTxnId);
                    div_success.Visible = false;
                    div_error.Visible = true;
                    //lblMessage.Text = "Transaction Failed<br/>Remarks : " + message + "-" + discription;
                }
            }
            else
            {
                div_success.Visible = false;
                div_error.Visible = true;
                lblMessage.Text = "<b>Payment Signature Mismatched. Some Manipulation in Data Occured during Payment Process.</b>";
            }
        }
    }
    private void update_payment(string procidure,string token_id,string status,string user_id,string status_code,string message,string description, string bankTxnID, string bank_charge, string amount, string name,string atomid)
    {
        try
        {
            cnn.cn.Open();
            SqlCommand cmd = new SqlCommand(procidure, cnn.cn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.Add("token", SqlDbType.NVarChar).Value = token_id;
            cmd.Parameters.Add("appl_pk", SqlDbType.NVarChar).Value = user_id;
            cmd.Parameters.Add("user_id", SqlDbType.NVarChar).Value = user_id;
            cmd.Parameters.Add("trans_no", SqlDbType.NVarChar).Value = bankTxnID;
            cmd.Parameters.Add("resp_code", SqlDbType.NVarChar).Value = status_code;
            cmd.Parameters.Add("status", SqlDbType.NVarChar).Value = status;
            cmd.Parameters.Add("description", SqlDbType.NVarChar).Value = description;
            cmd.Parameters.Add("message", SqlDbType.NVarChar).Value = message;
            cmd.Parameters.Add("bc", SqlDbType.NVarChar).Value = bank_charge;
            cmd.Parameters.Add("atomid", SqlDbType.NVarChar).Value = atomid;
            cmd.Parameters.Add("amount", SqlDbType.NVarChar).Value = amount;
            cmd.Parameters.Add("created", SqlDbType.NVarChar).Value = cnn.current_time.ToString("yyyy-MM-dd hh:mm:ss tt");
            int res = cmd.ExecuteNonQuery();
            if (res == -1)
            {
                Session["uid"] = user_id;
                Session["name"] = name;
                Session["auth"] = "G5R8H515";
                Session["ipadd"] = GetvisitorIP();

                if (status_code.Equals("OTS0000"))
                {
                    cnn.oprlog("Payment Successfull with Txn ID : " + token_id);
                    Response.Redirect("~/ApplMngt/pmt_success.aspx?tr" + cnn.Encrypt(token_id));
                }
                else
                {
                    cnn.oprlog("Payment Failled with Txn ID : " + token_id);
                    Response.Redirect("~/ApplMngt/pmt_fail.aspx");
                }
            }
        }
        catch (Exception ex)
        {
            lblMessage.Text = cnn.system_exception(System.Reflection.MethodInfo.GetCurrentMethod().Name, ex.ToString(), System.Web.HttpContext.Current.Request.Url.AbsoluteUri, ex.Message.ToString());
            ScriptManager.RegisterClientScriptBlock(this, this.GetType(), "alertMessage", "alert('" + cnn.exception_message + "')", true);
        }
        finally { cnn.cn.Close(); }
    }
    public String Encrypt(String plainText, String passphrase, String salt, Byte[] iv, int iterations)
    {
        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        string data = ByteArrayToHexString(Encrypt(plainBytes, GetSymmetricAlgorithm(passphrase, salt, iv, iterations))).ToUpper();
        return data;
    }
    public String decrypt(String plainText, String passphrase, String salt, Byte[] iv, int iterations)
    {
        byte[] str = HexStringToByte(plainText);

        string data1 = Encoding.UTF8.GetString(decrypt(str, GetSymmetricAlgorithm(passphrase, salt, iv, iterations)));
        return data1;
    }
    public byte[] Encrypt(byte[] plainBytes, SymmetricAlgorithm sa)
    {
        return sa.CreateEncryptor().TransformFinalBlock(plainBytes, 0, plainBytes.Length);

    }
    public byte[] decrypt(byte[] plainBytes, SymmetricAlgorithm sa)
    {
        return sa.CreateDecryptor().TransformFinalBlock(plainBytes, 0, plainBytes.Length);
    }
    public SymmetricAlgorithm GetSymmetricAlgorithm(String passphrase, String salt, Byte[] iv, int iterations)
    {
        var saltBytes = new byte[16];
        var ivBytes = new byte[16];
        Rfc2898DeriveBytes rfcdb = new System.Security.Cryptography.Rfc2898DeriveBytes(passphrase, Encoding.UTF8.GetBytes(salt), iterations, HashAlgorithmName.SHA512);
        saltBytes = rfcdb.GetBytes(32);
        var tempBytes = iv;
        Array.Copy(tempBytes, ivBytes, Math.Min(ivBytes.Length, tempBytes.Length));
        var rij = new RijndaelManaged(); //SymmetricAlgorithm.Create();
        rij.Mode = CipherMode.CBC;
        rij.Padding = PaddingMode.PKCS7;
        rij.FeedbackSize = 128;
        rij.KeySize = 128;

        rij.BlockSize = 128;
        rij.Key = saltBytes;
        rij.IV = ivBytes;
        return rij;
    }
    protected static byte[] HexStringToByte(string hexString)
    {
        try
        {
            int bytesCount = (hexString.Length) / 2;
            byte[] bytes = new byte[bytesCount];
            for (int x = 0; x < bytesCount; ++x)
            {
                bytes[x] = Convert.ToByte(hexString.Substring(x * 2, 2), 16);
            }
            return bytes;
        }
        catch
        {
            throw;
        }
    }
    public static string ByteArrayToHexString(byte[] ba)
    {
        StringBuilder hex = new StringBuilder(ba.Length * 2);
        foreach (byte b in ba)
            hex.AppendFormat("{0:x2}", b);
        return hex.ToString();
    }
    public bool Validate_HMACSHA512(string sign_data, string expectedHash, string key)
    {
        string message = sign_data;
        byte[] keyBytes = Encoding.UTF8.GetBytes(key);
        byte[] messageBytes = Encoding.UTF8.GetBytes(message);
        using (HMACSHA512 hmac = new HMACSHA512(keyBytes))
        {
            byte[] hashBytes = hmac.ComputeHash(messageBytes);
            string generatedSign = BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
            //lbsign.Text += "<br/>" + "generatedSign -->" + generatedSign;
            //lbsign.Text += "<br/>" + "ExpectedSign -->" + expectedHash;
            return generatedSign.Equals(expectedHash);
        }
    }
    public string GetvisitorIP()
    {
        string ip = null;
        try
        {
            // 1. x-public-ip
            ip = Request.Headers["x-public-ip"];

            // 2. x-client-ip: Retain frontend client-side IP header support
            if (string.IsNullOrEmpty(ip))
            {
                ip = Request.Headers["x-client-ip"];
            }

            // 3. x-forwarded-for
            if (string.IsNullOrEmpty(ip))
            {
                var forwardedFor = Request.Headers["x-forwarded-for"];
                if (!string.IsNullOrEmpty(forwardedFor))
                {
                    ip = forwardedFor.Split(',')[0].Trim();
                }
            }

            // 4. x-real-ip
            if (string.IsNullOrEmpty(ip))
            {
                ip = Request.Headers["x-real-ip"];
            }

            // 5. cf-connecting-ip
            if (string.IsNullOrEmpty(ip))
            {
                ip = Request.Headers["cf-connecting-ip"];
            }

            // 6. true-client-ip
            if (string.IsNullOrEmpty(ip))
            {
                ip = Request.Headers["true-client-ip"];
            }
        }
        catch
        {
            // Ignore headers extraction issues
        }

        // Connection Fallbacks
        if (string.IsNullOrEmpty(ip))
        {
            ip = Request.ServerVariables["REMOTE_ADDR"];
        }

        return ip;
    }
}