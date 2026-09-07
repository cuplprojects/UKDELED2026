using System;
using System.Security.Cryptography;
using System.Text;
using System.IO;
using System.Net;
using System.Web;
using System.Data;
using System.Data.SqlClient;
using System.Web.UI;
using Payrequest;
using System.Web.Script.Serialization;

public partial class test : System.Web.UI.Page
{
    globalconnection cnn = new globalconnection();
    protected void Page_Load(object sender, EventArgs e)
    {
        if (!IsPostBack)
        {
            if (Request.QueryString["p"] != null)
            {
                hplback.NavigateUrl = "~/ApplMngt/newappl_3.aspx?p=" + cnn.Encrypt("3");
                string step = cnn.Decrypt(HttpUtility.UrlDecode(Request.QueryString["p"].ToString()));
                if (step.Equals("4"))
                {
                    get_cofigration();
                }
                else
                    Response.Redirect("home.aspx");
            }
            else
                Response.Redirect("home.aspx");
        }
    }
    private void get_cofigration()
    {
        try
        {
            cnn.cn2.Open();
            SqlCommand cmd = new SqlCommand("get_sys_config", cnn.cn2);
            cmd.CommandType = CommandType.StoredProcedure;
            SqlDataReader dr = cmd.ExecuteReader();
            if (dr.HasRows)
            {
                dr.Read();
                string registration=dr["PAYMENT"].ToString();
                if(registration.Equals("Y"))
                {
                    bind_application();
                    HfOrderID.Text = lb_appl_id.Text + cnn.current_time.ToString("hhmmss");
                    create_payment(HfOrderID.Text);
                    insert_payment();
                    panel_payment.Visible = true;
                    panel_end.Visible = false;
                }
                else
                {
                    panel_payment.Visible = false;
                    panel_end.Visible = true;
                }
                dr.Close();
            }
        }
        catch (Exception ex)
        {
            lberror.Text += cnn.system_exception(System.Reflection.MethodInfo.GetCurrentMethod().Name, ex.ToString(), System.Web.HttpContext.Current.Request.Url.AbsoluteUri, ex.Message.ToString());
            ScriptManager.RegisterClientScriptBlock(this, this.GetType(), "alertMessage", "alert('" + cnn.exception_message + "')", true);
        }
        finally { cnn.cn2.Close(); }
    }
    private void bind_application()
    {
        try
        {
            cnn.cn.Open();
            SqlCommand cmd = new SqlCommand("application_by_uid", cnn.cn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.Add("user_id", SqlDbType.NVarChar).Value = Session["uid"].ToString();
            SqlDataReader dr = cmd.ExecuteReader();
            if (dr.HasRows)
            {
                dr.Read();
                string locked = dr["STATUS"].ToString();
                string step_3 = dr["STEP_3"].ToString();
                if (locked.Equals("PAID"))
                    Response.Redirect("ApplPrint.aspx?id=" + cnn.Encrypt(Session["uid"].ToString()));
                else if (step_3.Length > 1)
                {
                    HfmID.Text = cnn.pay_mid;
                    lb_appl_id.Text = dr["pk"].ToString();
                    string category = dr["CATEGORY"].ToString();
                    string pwd = dr["PWD"].ToString();
                    string course = dr["course"].ToString();
                    HfEmail.Text = dr["email"].ToString();
                    HfMobile.Text = dr["mobile"].ToString();
                    HfName.Text = dr["name"].ToString();
                    HfCourse.Text = dr["course"].ToString();
                    lbamount.Text = get_fee_amt(course, category, pwd);
                }
                else
                    Response.Redirect("~/ApplMngt/newappl_3.aspx?p=" + cnn.Encrypt("3"));
                dr.Close();

            }
        }
        catch (Exception ex)
        {
            lberror.Text = cnn.system_exception(System.Reflection.MethodInfo.GetCurrentMethod().Name, ex.ToString(), System.Web.HttpContext.Current.Request.Url.AbsoluteUri, ex.Message.ToString());
            ScriptManager.RegisterClientScriptBlock(this, this.GetType(), "alertMessage", "alert('" + cnn.exception_message + "')", true);
        }
        finally { cnn.cn.Close(); }
    }
    private string get_fee_amt(string course, string category, string pwd)
    {
        int amount = 0;
        if (course.Equals("1") || course.Equals("2"))
        {
            if (pwd.Equals("YES"))
                amount = 300;
            else if (category.Equals("GEN") || category.Equals("OBC") || category.Equals("EWS"))
                amount = 600;
            else
                amount = 300;
        }
        else if (course.Equals("3"))
        {
            if (pwd.Equals("YES"))
                amount = 500;
            else if (category.Equals("GEN") || category.Equals("OBC") || category.Equals("EWS"))
                amount = 1000;
            else
                amount = 500;
        }
        else
            amount = 0;

        amount=10;
        HfAmount.Text = (amount).ToString();
        return amount.ToString() + ".00";
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
    private void create_payment(string txnid)
    {
        string payInstrument = "";
        try
        {

            Payrequest.RootObject rt = new Payrequest.RootObject();
            Payrequest.MsgBdy mb = new Payrequest.MsgBdy();
            Payrequest.HeadDetails hd = new Payrequest.HeadDetails();
            // Payrequest.HeadDetails hd = new Payrequest.HeadDetails();
            Payrequest.MerchDetails md = new Payrequest.MerchDetails();
            Payrequest.PayDetails pd = new Payrequest.PayDetails();
            Payrequest.CustDetails cd = new Payrequest.CustDetails();
            Payrequest.Extras ex = new Payrequest.Extras();
            Payrequest.Payrequest pr = new Payrequest.Payrequest();


            hd.version = "OTSv1.1";
            hd.api = "AUTH";
            hd.platform = "FLASH";

            md.merchId = cnn.pay_mid;
            md.userId = cnn.pay_mid;
            md.password = cnn.pay_pwd;
            md.merchTxnId = txnid;
            md.merchTxnDate = cnn.current_time.ToString("yyyy-MM-dd hh:mm:ss");

            pd.amount =HfAmount.Text;
            pd.product = "SCHOOL";
            pd.custAccNo = lb_appl_id.Text;
            pd.txnCurrency = "INR";

            cd.custEmail = HfEmail.Text;
            cd.custMobile = HfMobile.Text;

            ex.udf1 = HfMobile.Text;
            ex.udf2 = HfName.Text;
            ex.udf3 = HfCourse.Text;
            ex.udf4 = lb_appl_id.Text;
            ex.udf5 = "";

            pr.headDetails = hd;
            pr.merchDetails = md;
            pr.payDetails = pd;
            pr.custDetails = cd;
            pr.extras = ex;

            rt.payInstrument = pr;
            var json = new JavaScriptSerializer().Serialize(rt);
            //lbjason.Text = json.ToString();

            string passphrase = cnn.pay_req_key;
            string salt = cnn.pay_req_key;
            byte[] iv = { 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 };
            int iterations = 65536;
            int keysize = 256;
            //string plaintext = "{\"payInstrument\":{\"headDetails\":{\"version\":\"OTSv1.1\",\"payMode\":\"SL\",\"channel\":\"ECOMM\",\"api\":\"SALE\",\"stage\":1,\"platform\":\"WEB\"},\"merchDetails\":{\"merchId\":8952,\"userId\":\"\",\"password\":\"Test@123\",\"merchTxnId\":\"1234567890\",\"merchType\":\"R\",\"mccCode\":562,\"merchTxnDate\":\"2019-12-24 20:46:00\"},\"payDetails\":{\"prodDetails\":[{\"prodName\": \"NSE\",\"prodAmount\": 10.00}],\"amount\":10.00,\"surchargeAmount\":0.00,\"totalAmount\":10.00,\"custAccNo\":null,\"custAccIfsc\":null,\"clientCode\":\"12345\",\"txnCurrency\":\"INR\",\"remarks\":null,\"signature\":\"7c643bbd9418c23e972f5468377821d9f0486601e1749930816c409fddbc7beb5d2943d832b6382d3d4a8bd7755e914922fb85aa8c234210bf2993566686a46a\"},\"responseUrls\":{\"returnUrl\":\"http://172.21.21.136:9001/payment/ots/v1/merchresp\",\"cancelUrl\":null,\"notificationUrl\":null},\"payModeSpecificData\":{\"subChannel\":[\"BQ\"],\"bankDetails\":null,\"emiDetails\":null,\"multiProdDetails\":null,\"cardDetails\":null},\"extras\":{\"udf1\":null,\"udf2\":null,\"udf3\":null,\"udf4\":null,\"udf5\":null},\"custDetails\":{\"custFirstName\":null,\"custLastName\":null,\"custEmail\":\"test@gm.com\",\"custMobile\":null,\"billingInfo\":null}}} ";
            string hashAlgorithm = "SHA1";
            string Encryptval = Encrypt(json, passphrase, salt, iv, iterations);
			//lbjason.Text = Encryptval;
            System.Net.ServicePointManager.SecurityProtocol = System.Net.SecurityProtocolType.Tls12;
            string testurleq = "https://payment1.atomtech.in/ots/aipay/auth?merchId="+cnn.pay_mid+"&encData=" + Encryptval;
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(testurleq);
            ServicePointManager.Expect100Continue = true;
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
            ServicePointManager.ServerCertificateValidationCallback = delegate { return true; };

            request.Proxy.Credentials = CredentialCache.DefaultCredentials;
            Encoding encoding = new UTF8Encoding();
            byte[] data = encoding.GetBytes(json);
            request.ProtocolVersion = HttpVersion.Version11;
            request.Method = "POST";
            request.ContentType = "application/json";
            request.ContentLength = data.Length;
            //request.Timeout = 600000;
            Stream stream = request.GetRequestStream();
            stream.Write(data, 0, data.Length);
            //Console.WriteLine(stream);
            // Console.WriteLine(json);
            stream.Close();
            HttpWebResponse response = (HttpWebResponse)request.GetResponse();
            string jsonresponse = response.ToString();

            StreamReader reader = new StreamReader(response.GetResponseStream());
            ////  string jsonresponse = post;
            string temp = null;
            string status = "";
            while ((temp = reader.ReadLine()) != null)
            {
                jsonresponse += temp;
            }
            //InitiateOrderResEq.RootObject objectres = new InitiateOrderResEq.RootObject();
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            var result = jsonresponse.Replace("System.Net.HttpWebResponse", "");
            //// var result = "{\"initiateDigiOrderResponse\":{ \"msgHdr\":{ \"rslt\":\"OK\"},\"msgBdy\":{ \"sts\":\"ACPT\",\"txnId\":\"DIG2019039816365405440004\"}}}";
            //  var  objectres = new System.Web.Script.Serialization.JavaScriptSerializer().Deserialize<Payverify.Payverify>(result);

            var uri = new Uri("http://atom.in?" + result);


            var query = HttpUtility.ParseQueryString(uri.Query);

            string encData = query.Get("encData");
            string passphrase1 = cnn.pay_res_key;
            string salt1 = cnn.pay_res_key;
            string Decryptval = decrypt(encData, passphrase1, salt1, iv, iterations);
            Payverify.Payverify objectres = new Payverify.Payverify();
            objectres = new System.Web.Script.Serialization.JavaScriptSerializer().Deserialize<Payverify.Payverify>(Decryptval);
            string txnMessage = objectres.responseDetails.txnMessage;
            //Tok_id.Text = objectres.atomTokenId;
            //lbldata.Text =Decryptval;
            HfTokenID.Text = objectres.atomTokenId;
        }
        catch (Exception ex)
        {
            lbldata.Text +=ex.ToString();
        }
    }
    public string Encrypt(string plainText, string passphrase, string salt, byte[] iv, int iterations)
    {
        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        string data = ByteArrayToHexString(Encrypt(plainBytes, GetSymmetricAlgorithm(passphrase, salt, iv, iterations))).ToUpper();
        return data;
    }
    public string decrypt(string plainText, string passphrase, string salt, byte[] iv, int iterations)
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
    public SymmetricAlgorithm GetSymmetricAlgorithm(string passphrase, string salt, byte[] iv, int iterations)
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

    protected void insert_payment()
    {
        try
        {
            string ipadd = GetvisitorIP();
            cnn.cn.Open();
            SqlCommand cmd = new SqlCommand("payment_new", cnn.cn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.Add("appl_pk", SqlDbType.NVarChar).Value = lb_appl_id.Text;
            cmd.Parameters.Add("user_id", SqlDbType.NVarChar).Value = Session["uid"].ToString();
            cmd.Parameters.Add("fee_total", SqlDbType.NVarChar).Value = HfAmount.Text;
            cmd.Parameters.Add("orderID", SqlDbType.NVarChar).Value = DBNull.Value;
            cmd.Parameters.Add("token", SqlDbType.NVarChar).Value = HfOrderID.Text;
            cmd.Parameters.Add("ip_address", SqlDbType.NVarChar).Value = ipadd;
            cmd.Parameters.Add("created", SqlDbType.NVarChar).Value = cnn.current_time.ToString("yyyy-MM-dd hh:mm:ss tt");
            int res = cmd.ExecuteNonQuery();
            if (res == -1)
            {
                cnn.oprlog("Payment Initiated with Token : " + HfTokenID);
                Session["orderID"] = HfOrderID.Text;
                Session["token"] = HfTokenID.Text;
                Session["amt"] = HfAmount.Text;
            }
        }
        catch (Exception ex)
        {
            lberror.Text = "New : " + ex.Message.ToString();
        }
        finally { cnn.cn.Close(); }
    }

}